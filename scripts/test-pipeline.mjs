// Teste end-to-end do pipeline /api/analyze (uso interno de desenvolvimento).
// Gera um áudio de atendimento com TTS, autentica como a conta de teste e
// envia para a rota real, imprimindo o resultado.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import OpenAI from "openai";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const ROOT = process.cwd();

// Carrega .env.local manualmente.
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const sa = JSON.parse(readFileSync(join(ROOT, "service-account.json"), "utf8"));
const app = initializeApp({
  credential: cert({
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: sa.private_key,
  }),
});

const TEST_EMAIL = "teste.vendedor@simplifica.dev";
const AUDIO_PATH = join(ROOT, "test-atendimento.mp3");

const SCRIPT = `Oi, bom dia! Aqui é o Thiago, da Simplifica. Tudo bem?
Então, recebi seu contato pedindo informação sobre a nossa consultoria comercial.
Deixa eu te perguntar rapidinho: hoje quantos vendedores você tem no time?
Ah, entendi. E qual tem sido o maior gargalo de vocês nas vendas atualmente?
Sei. Olha, a gente tem um método que resolve exatamente isso.
O investimento é de dois mil reais por mês. O que você acha? Fechamos?`;

async function main() {
  const mock = env.AI_MOCK === "true";

  // 1. Prepara o áudio. Em modo mock, o conteúdo não importa (a IA é simulada),
  // então usamos um arquivo pequeno de placeholder. Caso contrário, TTS real.
  if (mock) {
    if (!existsSync(AUDIO_PATH)) {
      writeFileSync(AUDIO_PATH, Buffer.alloc(2048, 1));
    }
    console.log("Modo MOCK ativo — usando áudio placeholder.");
  } else if (!existsSync(AUDIO_PATH)) {
    console.log("Gerando áudio de teste com TTS...");
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: SCRIPT,
    });
    writeFileSync(AUDIO_PATH, Buffer.from(await speech.arrayBuffer()));
    console.log("Áudio salvo em", AUDIO_PATH);
  } else {
    console.log("Reutilizando áudio existente.");
  }

  // 2. Autentica como a conta de teste (custom token -> idToken).
  const uid = (await getAuth(app).getUserByEmail(TEST_EMAIL)).uid;
  const customToken = await getAuth(app).createCustomToken(uid);
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  ).then((r) => r.json());
  const idToken = exchange.idToken;
  if (!idToken) throw new Error("Falha ao obter idToken: " + JSON.stringify(exchange));
  console.log("Autenticado como", TEST_EMAIL, "(uid " + uid + ")");

  // 3. Envia para /api/analyze.
  const audio = readFileSync(AUDIO_PATH);
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/mpeg" }), "atendimento.mp3");
  form.append("attendanceType", "reuniao");
  form.append("observation", "Atendimento de teste gerado por TTS.");

  console.log("Enviando para /api/analyze... (transcrição + análise)");
  const t0 = Date.now();
  const res = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  });
  const body = await res.json();
  console.log(`\nStatus: ${res.status} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log(JSON.stringify(body, null, 2));
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
