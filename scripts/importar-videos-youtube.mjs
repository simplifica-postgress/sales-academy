// Importa vídeos de um canal do YouTube para a coleção `videos`.
//
// IMPORTANTE: importa tudo OCULTO (enabled: false). Ninguém vê até o master
// revisar e ativar em /admin/videos. É de propósito — o mapeamento para os
// Princípios é feito pela DESCRIÇÃO do vídeo, não assistindo, então precisa
// de conferência humana antes de ir para os vendedores.
//
// Limite conhecido: o feed RSS do YouTube devolve só os 15 vídeos mais
// recentes do canal. Para trazer o resto seria preciso a YouTube Data API
// (com chave) ou cadastrar manualmente.
//
// Uso: node scripts/importar-videos-youtube.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const CANAL = process.env.CANAL_ID || "UCF2vtcMnDHzwEyJlxZr880Q";

const sa = JSON.parse(readFileSync(join(process.cwd(), "service-account.json"), "utf8"));
const app = initializeApp({
  credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
});
const db = getFirestore(app, "default");

/**
 * Palavras da descrição → princípio correspondente.
 * Mapeamento por texto, não por conteúdo assistido: serve de PONTO DE PARTIDA
 * para o master ajustar, não como verdade.
 */
const REGRAS = [
  { re: /vou pensar|contornar a obje/i, principio: "iDLcv4R0lzNwzQYNijHB", nota: "objeção 'vou pensar'" },
  { re: /quantas vezes|ligar para o mesmo lead|cliente esquecido|que n[ãa]o liga/i, principio: "c2RQNxcRD62DHuSKR9eX", nota: "follow-up" },
  { re: /n[ãa]o posso falar agora/i, principio: "zKeORAm4ML6YHdsbXif0", nota: "pedir autorização / momento certo" },
  { re: /mais leads|consertar seu comercial|concertar seu comercial/i, principio: "mXlHakmBUBhCUiA3VsRO", nota: "diagnóstico antes de solução" },
  { re: /obje[çc][ãa]o pode salvar/i, principio: "mXlHakmBUBhCUiA3VsRO", nota: "objeção revela o problema real" },
  { re: /tarde de atendimento|atendimento comigo/i, principio: "19HFf36Jth1eL8ms8tNY", nota: "atendimento real de referência" },
];

const dec = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Título melhor: muitos shorts se chamam "Faz sentido?" e a descrição diz o tema. */
function melhorTitulo(titulo, descricao) {
  // Colapsa quebras de linha: descrição do YouTube vem quebrada e o título
  // ficaria em várias linhas dentro do card.
  const limpaDesc = descricao.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  const genericos = /^(faz sentido\??|vem ver!?|essa vale ouro!?|j[áa] passou por isso\??)$/i;
  if (genericos.test(titulo.trim()) && limpaDesc && !genericos.test(limpaDesc)) {
    // Capitaliza: as descrições vêm quase todas em CAIXA ALTA.
    const t = limpaDesc.length > 90 ? limpaDesc.slice(0, 90) + "…" : limpaDesc;
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }
  return titulo.trim();
}

async function main() {
  const xml = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${CANAL}`
  ).then((r) => r.text());

  const entradas = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  if (entradas.length === 0) {
    console.log("Nenhum vídeo no feed. Confira o CANAL_ID.");
    process.exit(1);
  }

  const existentes = new Set(
    (await db.collection("videos").get()).docs.map((d) => d.get("youtubeId")).filter(Boolean)
  );
  const ultimo = await db.collection("videos").orderBy("order", "desc").limit(1).get();
  let order = ultimo.empty ? 0 : ultimo.docs[0].get("order") ?? 0;

  let novos = 0;
  let pulados = 0;
  const semVinculo = [];

  for (const e of entradas) {
    const id = (e.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
    if (!id) continue;
    if (existentes.has(id)) {
      pulados += 1;
      continue;
    }
    const tituloBruto = dec((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
    const descricao = dec(((e.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || "").trim());
    const alvo = `${tituloBruto} ${descricao}`;

    const regra = REGRAS.find((r) => r.re.test(alvo));
    const titulo = melhorTitulo(tituloBruto, descricao);

    order += 1;
    await db.collection("videos").add({
      title: titulo,
      description: regra ? `Tema: ${regra.nota}` : "",
      source: "youtube",
      url: `https://www.youtube.com/watch?v=${id}`,
      storagePath: null,
      youtubeId: id,
      principleIds: regra ? [regra.principio] : [],
      order,
      // OCULTO até o master revisar.
      enabled: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    novos += 1;
    console.log(`+ ${id} | ${regra ? "→ princípio" : "SEM VÍNCULO"} | ${titulo}`);
    if (!regra) semVinculo.push(`${id} — ${titulo}`);
  }

  console.log(`\n${novos} importado(s) como OCULTO, ${pulados} já existiam.`);
  if (semVinculo.length) {
    console.log(`\nSem vínculo com princípio (precisam da sua conferência):`);
    semVinculo.forEach((s) => console.log(`  - ${s}`));
  }
  console.log(`\nRevise em /admin/videos: ajuste título, vincule ao princípio e ative.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
