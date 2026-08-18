import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { adminBucket, adminDb } from "@/lib/server/firebaseAdmin";
import { temAcesso } from "@/lib/server/reunioesAuth";
import { transcribe } from "@/lib/server/openai";
import { getKnowledgeText } from "@/lib/server/knowledge";
import {
  ESQUEMA_REUNIAO,
  notaGeral,
  promptSistema,
  promptUsuario,
  type ResultadoReuniao,
} from "@/lib/reunioes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reunião de 1h leva bem mais que um áudio de atendimento.
export const maxDuration = 800;

const MODELO = "gpt-5.1";

export async function POST(req: Request) {
  try {
    return await analisar(req);
  } catch (err) {
    console.error("Erro não tratado em /api/reunioes/analisar:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json(
      { error: `Falha ao analisar a reunião: ${detalhe}` },
      { status: 500 }
    );
  }
}

async function analisar(req: Request) {
  if (!(await temAcesso())) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    titulo?: string;
    participantes?: string;
    contexto?: string;
    caminho?: string;
    textoColado?: string;
  };

  const titulo = (body.titulo ?? "").trim();
  const participantes = (body.participantes ?? "").trim();
  const contexto = (body.contexto ?? "").trim();
  const caminho = (body.caminho ?? "").trim();
  const textoColado = (body.textoColado ?? "").trim();

  if (!caminho && !textoColado) {
    return NextResponse.json(
      { error: "Envie a gravação ou cole a transcrição." },
      { status: 400 }
    );
  }
  // Só a pasta desta ferramenta: impede pedir a transcrição de gravações
  // de vendedores do Sales Academy, que ficam noutro lugar do Storage.
  if (caminho && !caminho.startsWith("reunioes-internas/")) {
    return NextResponse.json({ error: "Caminho inválido." }, { status: 403 });
  }

  // ---- 1. Transcrição ----
  let transcricao: string;
  let origem: "arquivo" | "texto";

  if (caminho) {
    origem = "arquivo";
    const arquivo = adminBucket.file(caminho);
    const [existe] = await arquivo.exists();
    if (!existe) {
      return NextResponse.json(
        { error: "A gravação não chegou ao servidor. Tente enviar de novo." },
        { status: 404 }
      );
    }
    const [meta] = await arquivo.getMetadata();
    const [buffer] = await arquivo.download();
    transcricao = (
      await transcribe(buffer, caminho.split("/").pop() ?? "reuniao", meta.contentType ?? "")
    ).trim();
    if (transcricao.length < 40) {
      return NextResponse.json(
        { error: "Não consegui entender o áudio da reunião. Verifique a gravação." },
        { status: 400 }
      );
    }
  } else {
    origem = "texto";
    transcricao = textoColado;
    if (transcricao.length < 40) {
      return NextResponse.json(
        { error: "Cole a transcrição da reunião (pelo menos 40 caracteres)." },
        { status: 400 }
      );
    }
  }

  // ---- 2. Análise ----
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ausente no servidor." },
      { status: 500 }
    );
  }
  // A mesma metodologia que alimenta o Sales Academy — o time avalia a
  // reunião pela régua da casa, não por uma régua genérica.
  const metodologia = await getKnowledgeText().catch(() => "");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resposta = await openai.chat.completions.create({
    model: MODELO,
    messages: [
      { role: "system", content: promptSistema(metodologia) },
      { role: "user", content: promptUsuario(titulo, participantes, contexto, transcricao) },
    ],
    response_format: { type: "json_schema", json_schema: ESQUEMA_REUNIAO },
  });

  const bruto = resposta.choices[0]?.message?.content;
  if (!bruto) {
    return NextResponse.json({ error: "A IA não retornou conteúdo." }, { status: 502 });
  }
  const resultado = JSON.parse(bruto) as ResultadoReuniao;
  // Nota calculada aqui, pelos pesos — nunca o número que a IA disser.
  const nota = notaGeral(resultado.notas);

  // ---- 3. Guarda para comparar depois ----
  const doc = adminDb.collection("reunioes").doc();
  await doc.set({
    titulo: titulo || "Reunião sem título",
    participantes,
    contexto,
    transcricao,
    ...resultado,
    notaGeral: nota,
    origem,
    criadoEm: FieldValue.serverTimestamp(),
  });

  // A gravação já virou transcrição: guardá-la só ocuparia espaço e manteria
  // conversa de cliente parada no Storage sem necessidade.
  if (caminho) {
    await adminBucket.file(caminho).delete().catch(() => {});
  }

  return NextResponse.json({ id: doc.id, notaGeral: nota });
}
