import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/server/adminAuth";
import { deleteRecordingFile } from "@/lib/server/recordings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apaga a GRAVAÇÃO (arquivo no Storage) de um envio, preservando a análise.
 *
 * Atende ao direito de exclusão da LGPD sem destruir o histórico de
 * treinamento: a transcrição, as notas e a missão continuam no Firestore —
 * elas não dependem do arquivo, que só serve para gerar a transcrição.
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireAdmin(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const { uploadId } = (await req.json()) as { uploadId?: string };
  if (!uploadId) {
    return NextResponse.json({ error: "Informe o uploadId." }, { status: 400 });
  }

  const result = await deleteRecordingFile(uploadId, caller.uid);
  if (result.notFound) {
    return NextResponse.json({ error: "Envio não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    alreadyDeleted: result.alreadyDeleted ?? false,
  });
}
