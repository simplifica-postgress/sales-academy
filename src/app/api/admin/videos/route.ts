import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { AuthError, requireMaster, type Caller } from "@/lib/server/adminAuth";
import { adminBucket, adminDb } from "@/lib/server/firebaseAdmin";
import { youtubeId } from "@/lib/video";
import { ACCEPTED_VIDEO_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Vídeos e aulas — só o master cadastra; todo mundo assiste.
 *
 * Para arquivo: o master envia primeiro para `uploads/{uid}/` (único lugar
 * onde as regras do Storage deixam o navegador escrever) e manda aqui o
 * caminho. O backend COPIA para `videos/` e apaga o temporário. Assim
 * ninguém publica vídeo direto do navegador.
 */
export async function POST(req: Request) {
  let caller: Caller;
  try {
    caller = await requireMaster(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = (await req.json()) as {
    action?: "create" | "update" | "delete" | "reorder";
    id?: string;
    title?: string;
    description?: string;
    youtubeUrl?: string;
    filePath?: string;
    principleIds?: string[];
    enabled?: boolean;
    order?: number;
    ids?: string[];
  };

  const col = adminDb.collection("videos");

  // ---------- criar ----------
  if (body.action === "create") {
    const title = (body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Informe o título do vídeo." }, { status: 400 });
    }

    const doc = col.doc();
    let source: "upload" | "youtube";
    let url = "";
    let storagePath: string | null = null;
    let ytId: string | null = null;

    if (body.filePath) {
      const origem = body.filePath.trim();
      // Só a própria pasta: impede publicar arquivo de outra pessoa.
      if (!origem.startsWith(`uploads/${caller.uid}/`)) {
        return NextResponse.json({ error: "Caminho de arquivo inválido." }, { status: 403 });
      }
      const temp = adminBucket.file(origem);
      const [existe] = await temp.exists();
      if (!existe) {
        return NextResponse.json({ error: "Arquivo não encontrado no Storage." }, { status: 404 });
      }
      const [meta] = await temp.getMetadata();
      const tipo = meta.contentType ?? "";
      if (Number(meta.size ?? 0) > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Arquivo muito grande." }, { status: 400 });
      }
      if (!ACCEPTED_VIDEO_TYPES.includes(tipo)) {
        return NextResponse.json({ error: "Envie um vídeo (MP4 ou MOV)." }, { status: 400 });
      }

      const nome = origem.split("/").pop() ?? "video.mp4";
      const destino = `videos/${doc.id}/${nome}`;
      await temp.copy(adminBucket.file(destino));
      await temp.delete().catch(() => {});

      source = "upload";
      storagePath = destino;
      // Token de download: é assim que o <video> consegue tocar o arquivo.
      const destFile = adminBucket.file(destino);
      const token = crypto.randomUUID();
      await destFile.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
      url = `https://firebasestorage.googleapis.com/v0/b/${adminBucket.name}/o/${encodeURIComponent(destino)}?alt=media&token=${token}`;
    } else if (body.youtubeUrl) {
      ytId = youtubeId(body.youtubeUrl);
      if (!ytId) {
        return NextResponse.json({ error: "Link do YouTube inválido." }, { status: 400 });
      }
      source = "youtube";
      url = `https://www.youtube.com/watch?v=${ytId}`;
    } else {
      return NextResponse.json(
        { error: "Envie um arquivo ou informe o link do YouTube." },
        { status: 400 }
      );
    }

    const ultimo = await col.orderBy("order", "desc").limit(1).get();
    const order = ultimo.empty ? 1 : (ultimo.docs[0].get("order") ?? 0) + 1;

    await doc.set({
      title,
      description: (body.description ?? "").trim(),
      source,
      url,
      storagePath,
      youtubeId: ytId,
      principleIds: Array.isArray(body.principleIds) ? body.principleIds : [],
      order,
      enabled: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: doc.id });
  }

  if (!body.id && body.action !== "reorder") {
    return NextResponse.json({ error: "Informe o vídeo." }, { status: 400 });
  }

  // ---------- editar ----------
  if (body.action === "update") {
    const ref = col.doc(body.id!);
    if (!(await ref.get()).exists) {
      return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });
    }
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (body.title !== undefined) patch.title = body.title.trim();
    if (body.description !== undefined) patch.description = body.description.trim();
    if (body.principleIds !== undefined) patch.principleIds = body.principleIds;
    if (body.enabled !== undefined) patch.enabled = body.enabled;
    await ref.update(patch);
    return NextResponse.json({ ok: true });
  }

  // ---------- remover ----------
  if (body.action === "delete") {
    const ref = col.doc(body.id!);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Vídeo não encontrado." }, { status: 404 });
    }
    // Apaga o arquivo junto: vídeo removido não pode continuar ocupando
    // Storage (e sendo acessível por quem guardou a URL).
    const caminho = snap.get("storagePath") as string | null;
    if (caminho) await adminBucket.file(caminho).delete().catch(() => {});
    await ref.delete();
    return NextResponse.json({ ok: true });
  }

  // ---------- reordenar ----------
  if (body.action === "reorder" && Array.isArray(body.ids)) {
    const batch = adminDb.batch();
    body.ids.forEach((id, i) => batch.update(col.doc(id), { order: i + 1 }));
    await batch.commit();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
