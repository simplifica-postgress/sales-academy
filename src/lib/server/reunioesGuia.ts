import "server-only";
import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

/**
 * Guia da REUNIÃO de fechamento da Simplifica — a régua da análise de
 * reuniões (/reunioes).
 *
 * ISOLADO DE PROPÓSITO. Este guia vive nas coleções "reunioesGuia" e
 * "reunioesGuiaHistorico", que só este arquivo lê e escreve. A base do
 * Sales Academy (coleção "knowledge", que avalia ATENDIMENTO) é outra coisa
 * e nunca se cruza com esta: coleções diferentes, funções diferentes,
 * destinos diferentes. Misturar faria a IA cobrar de quem atende WhatsApp
 * coisas de reunião de fechamento, e vice-versa.
 *
 * O texto pode ser editado por qualquer pessoa do time pela própria página.
 * Por isso toda troca guarda a versão anterior: uma edição errada (ou um
 * Ctrl+A apagado por engano) se desfaz com um clique.
 */

const DOC = adminDb.collection("reunioesGuia").doc("atual");
const HISTORICO = adminDb.collection("reunioesGuiaHistorico");

/** Guia de fábrica: vale enquanto ninguém editar pela página. */
export const GUIA_PADRAO = `
Condução Reunião de Fechamento - SIMPLIFICA
Sempre chamar atenção do cliente (ok? vamos lá? bora? certo?)
Todo mundo tem cérebro de gelatina
Método
1- Conexão/autoridade
2- Diagnóstico/Apresentação/Negociação/Fechamento


Pontos da reunião:
 - Conexão imediata

Sorria assim que o lead entrar na reunião, e não tire o olhar da câmera nos 2 primeiros minutos.

1º RAPPORT - falar com cliente do tempo, da cidade, do clima, dos filhos, qualquer coisa que não pareça um vendedor chato.

Objetivos: Conexão / Quebra de expectativas / Detectar perfil comportamental (DISC) e nível de desafio.
O que fazer: Analisar a adaptar (espelhar) a sua condução ao perfil do cliente.

 -  Autoridade

2º ABERTURA PARA CONDUÇÃO
- Vou me apresentar de um jeito um pouco mais formal, para que você me conheça melhor como profissional e te explicar também qual é o objetivo e como é o funcionamento desta reunião, para que você consiga me acompanhar.  ok? vamos lá?
Principal objetivo: Mostrar para o cliente quem está no comando / Conseguir a atenção dele e fazer com que lhe acompanhe.

3º APRESENTAÇÃO PESSOAL / EXPLICAÇÃO DO OBJETIVO E FUNCIONAMENTO DA REUNIÃO–
Objetivos: Fazer com que o cliente me enxergue como autoridade, Quando o cliente compra o vendedor, ele compra o produto.


3 - B - Explicação objetivo e funcionamento-

Objetivo: tirar a pressão de “vender” e posicionar a conversa como diagnóstico.
“Antes de te apresentar qualquer coisa, eu quero entender como funciona o seu comercial [CLÍNICA/ESCOLA] hoje.
Porque a gente não acredita em chegar com uma solução pronta sem entender primeiro onde está o problema.
Vou te fazer algumas perguntas rápidas sobre números, marketing e vendas. No final, se eu enxergar que realmente existe algo que podemos resolver, eu te mostro como funciona o nosso trabalho. Pode ser?”

4ª ESCUTA ATIVA:  ENCONTRAR DORES PARA USAR NA VENDA
Quero te conhecer melhor, me conta mais sobre a sua história, como chegou até aqui, a quanto tempo tem a sua empresa… realmente o objetivo é conhecer melhor você e sua empresa. Pode ser? bora? vamos lá? me ajuda aqui.

DIAGNÓSTICO SPIN
SITUAÇÃO
Objetivo: mapear o processo comercial atual sem julgar.
Perguntas
“Qual é a meta de faturamento [MATRÍCULA] de vocês hoje?”
“Vocês sabem quantas oportunidades precisam gerar para chegar nessa meta?”
“E vocês acompanham esses números durante o mês?”
Quem atende o primeiro contato — e em quanto tempo?

Usam alguma ferramenta hoje? (planilha, CRM, WhatsApp solto?)
Não tente preencher silêncio. Deixe o empresário responder.


PROBLEMA
Perguntas de problema (achar a dor):
“Hoje vocês sabem exatamente onde estão perdendo mais vendas?”
“Quando vocês ficam abaixo da meta, conseguem identificar exatamente o que aconteceu?”
“Hoje você sente que tem controle do comercial ou depende muito do que acontece no mês?”

Já perdeu vendas por demora no atendimento?

O follow-up é feito? Por quem? Como você garante que é feito?


IMPACTO
Aqui você começa a aprofundar.
“Se vocês não sabem quantas oportunidades precisam gerar, como definem se o investimento em marketing está adequado?”
“Quanto você acha que pode estar deixando de faturar por não saber exatamente onde estão essas perdas?”

Se um vendedor sair amanhã, o histórico e o relacionamento vão junto com ele?

Esse gargalo tende a piorar conforme você aumenta o volume de leads?
E então a principal:
“Se eu te perguntasse hoje quanto sua empresa vai faturar no próximo mês, você conseguiria me responder com segurança?”


NECESSIDADE
“Se você tivesse clareza dos números que precisam acontecer para bater sua meta, isso mudaria a forma como você administra o comercial hoje?”

Faz sentido ter um processo que não dependa da memória de cada vendedor?

Quanto valeria recuperar boa parte dos leads que hoje somem?
 Não precisa fazer todas as perguntas do diagnóstico mais pelo 2 de cada etapa.

O VENDEDOR EXCELENTE, ELE PERGUNTA E NÃO AFIRMA.
ELE FAZ O CLIENTE PERCEBER AS PRÓPRIAS FRAQUEZAS.

TRANSIÇÃO N → PROPOSTA

Agora você não apresenta a ROTA ainda.
Primeiro, devolva para o empresário o que você ouviu.
“Pelo que você me contou, eu vejo três pontos aqui.”

Por exemplo:
“Primeiro: vocês têm uma meta, mas não existe uma matemática clara mostrando o que precisa acontecer para chegar nela.
Segundo: vocês até conseguem acompanhar vendas e leads, mas não conseguem identificar com precisão onde estão as perdas.
E terceiro: quando o mês termina, vocês sabem quanto venderam, mas não necessariamente conseguem prever quanto vão vender no próximo.”
Então faça a pergunta:
“Faz sentido essa leitura?”
Espere o sim.
Esse momento é importante porque o problema passa a ser validado pelo próprio cliente.


DESCOBRIU QUAL A PRINCIPAL DOR? ENFATIZAR A SOLUÇÃO QUE RESOLVE A DOR, DURANTE A ETAPA DE APRESENTAÇÃO DE IMPACTO (5ª ETAPA)


  -  Apresentação MÉTODO
Agora vem a virada.
“É exatamente esse problema que a gente resolve.
E foi por isso que criamos a ROTA.”
R — RESULTADO
“Primeiro, definimos exatamente onde você quer chegar.
Qual é a meta de faturamento? Quantas vendas? Qual ticket? Em quanto tempo?”
O — OPORTUNIDADES
“Depois, descobrimos quantas oportunidades precisam entrar para essa meta acontecer.
De onde elas vêm, quanto custa gerar essas oportunidades e quais canais realmente fazem sentido.”
T — TAXAS
“Depois olhamos para as taxas.
Quantas oportunidades viram atendimento? Quantas viram proposta? Quantas viram venda?
Porque não adianta simplesmente gerar mais leads se o problema está na conversão.”
A — ACOMPANHAMENTO
“E finalmente, acompanhamos tudo isso.
Porque a previsibilidade não vem de fazer um planejamento uma vez.
Vem de acompanhar os números e corrigir a rota durante o caminho.”
“A ROTA transforma uma meta em números, processos e ações para você saber o que precisa acontecer para chegar no resultado.”
E então:
“Você tem uma meta. A gente constrói a ROTA até ela.”
DEMONSTRAÇÃO DOS NÚMEROS

Aqui está uma das partes mais importantes da reunião.
Calculadora: https://docs.google.com/spreadsheets/d/1NCTkq1zt79-b3BGW8xGVU0Z8yRcEKWhS0pDeIRFLE74/edit?gid=1659636408#gid=1659636408

Você pega os números reais daquele negócio e constrói a ROTA na frente dele.
Exemplo:
Meta: R$ 200.000
Ticket médio: R$ 5.000
→ Precisamos de 40 vendas
Se a taxa de fechamento é 20%:
→ Precisamos de 200 oportunidades
Se 40% dos leads viram oportunidades:
→ Precisamos de 500 leads
Agora você mostra:
“Percebe a diferença?”
“Antes você tinha uma meta de R$ 200 mil.”
“Agora nós sabemos que, para chegar nesses R$ 200 mil, precisamos de aproximadamente 500 leads, 200 oportunidades e 40 vendas — considerando essas taxas.”
E então:
“Agora sua meta deixou de ser um desejo. Ela passou a ter uma matemática.”
E aqui você encontra o gargalo.
Se o cliente já gera 800 leads, mas só transforma 40 em vendas:
“Então o problema provavelmente não está na quantidade de leads.”
Se gera poucos leads:
“Então existe um problema de geração de oportunidades.”
Se gera muitas oportunidades, mas converte pouco:
“Então precisamos olhar para o comercial.”
Se as taxas são desconhecidas:
“Então o primeiro problema é justamente a falta de controle.”


Agora eu vou te mostrar como eu entrego o meu trabalho  e valor de investimento, Você sentiu que nós conseguimos resolver o seu problema?

só queria alinhar contigo de  ter o seu sim ou seu não nessa reunião pode ser?


 6ª Ancoragem da equipe


 7ª Depoimentos (Pegar o que mais encaixa com aquele cliente)

 - Negociação

CHECK LIST
   8ª ETAPA:

Alinhamento após apresentação de entregáveis -  Após o resumo da proposta antes de mostrar os valores

1 - Na sua visão tudo isso, resolve o problema da sua empresa hoje?

2 - Na sua visão a Simplifica te leva pra um próximo nível?



Porque perguntei isso:
“A próxima etapa é a etapa de negociação”

E eu gosto de realizar um alinhamento aqui, eu não consigo entregar uma negociação para clientes que não estão preparados,  agora e hora da negociação você quer negociar comigo?
Afinal, negociação é uma troca. tem que ser bom pra mim e pra você. Você está preparado? Quer negociar comigo?

Preço regular


Caso não avance no preço regular  entramos com a parte do CAF


       9ª ETAPA:

* Abraçar a objeção:

“- Eu te entendo, também passo pelo mesmo processo quando vou tomar uma decisão”

* Encontro a real objeção e forneço falsa sensação de escolha:
“- Certo, me ajuda a melhorar como profissional. O fato que você precisa validar é relacionado a valor de investimento ou realmente eu não fui claro na minha apresentação?”.
* (Matriz de isolamento de objeção).


 10ª ETAPA:

* Isolamento de objeção e criação de compromisso: (gatilho da coerência)
“Certo, só pra eu entender melhor.. quer dizer que tirando o fator investimento, por você estamos fechados? - É SÓ ESSE FATOR?

“Então vamos lá, eu tenho uma oferta especial aqui pra te fazer, se a questão é só financeira eu estou disposto a resolver pra você. Oferta CAF

 Quer ouvir minha oferta?”
caso ele não tenha falado qual é a melhor forma de pagamento? Mas me fala dessas maneiras qual é a melhor pra você? para tentar algo bom pra mim e pra você….


Olha vou aproveitar que meu sócio está na empresa hoje me diz qual é melhor forma de pagamento que vou tentar alguma coisa pra que fique bom pra mim e pra você nessa negociação


 - Fechamento

 11ª ETAPA:

* Oferta de Impacto CAF
“Essa oferta que eu vou te entregar é o melhor que eu posso fazer, mas negociação é troca,  ganha ganha, então eu vou te pedir algo nessa negociação também, e é uma entrada aqui na reunião. Bora? você está disposto?”

Não entenda como arrogância da minha parte é metodo.
 Vou pensar: De 0 a 10 qual chance de dia dia do empresário te pegar e você não não avançar comigo?
 Bora pra dentro do projeto?

 12ª ETAPA:

*  Falsa sensação de conquista
“Essa oferta é a melhor que consigo te entregar, mas eu tenho um sócio e preciso da validação. O que eu quero deixar acordado aqui com você, é que se eu ir até lá e conseguir validar essa oferta, você me faz o sinal aqui e vamos iniciar o projeto. Tenho seu compromisso? a oferta ficou boa?

A reunião inteira deve conduzir para uma ideia:

* “Você não precisa adivinhar quanto vai vender. Você precisa saber o que precisa acontecer para vender.”
* E a ROTA é o mecanismo que mostra esse caminho.
* Resultado → Oportunidades → Taxas → Acompanhamento.
* Meta → Matemática → Processo → Previsibilidade.


 Pegar indicação

MICRO LEARNING -

1 - Fazer o cliente se sentir burro -
Perguntar algo e fazer o cliente falar que não sabe o que é

2 - Promover ensino -
Dar uma pequena aula sobre o tema e deixar bem claro que : “- Vou te ensinar aqui pra você sair dessa reunião mais esperto do que entrou”

3 - Apresentar uma solução -
Mostrar na prática como você entrega a solução!
`.trim();

export const GUIA_MIN = 200;
export const GUIA_MAX = 120_000;

export type GuiaAtual = {
  texto: string;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  padrao: boolean;
};

export type VersaoGuia = {
  id: string;
  caracteres: number;
  trecho: string;
  substituidaEm: string | null;
  autor: string | null;
};

const iso = (t: Timestamp | undefined | null) => t?.toDate?.().toISOString() ?? null;

/** O guia em uso agora (o editado, ou o de fábrica). */
export async function lerGuia(): Promise<GuiaAtual> {
  const snap = await DOC.get();
  const texto = (snap.get("texto") as string | undefined)?.trim();
  if (!snap.exists || !texto) {
    return { texto: GUIA_PADRAO, atualizadoEm: null, atualizadoPor: null, padrao: true };
  }
  return {
    texto,
    atualizadoEm: iso(snap.get("atualizadoEm")),
    atualizadoPor: (snap.get("atualizadoPor") as string | null) ?? null,
    padrao: false,
  };
}

/** Grava um guia novo, guardando o anterior no histórico. */
export async function salvarGuia(texto: string, autor: string | null): Promise<void> {
  const anterior = await lerGuia();
  if (anterior.texto.trim() === texto.trim()) return; // nada mudou

  await HISTORICO.add({
    texto: anterior.texto,
    eraPadrao: anterior.padrao,
    autorDaVersao: anterior.atualizadoPor,
    substituidaEm: FieldValue.serverTimestamp(),
    substituidaPor: autor,
  });
  await DOC.set({
    texto: texto.trim(),
    atualizadoEm: FieldValue.serverTimestamp(),
    atualizadoPor: autor,
  });
}

/** Últimas versões substituídas, da mais recente para a mais antiga. */
export async function listarVersoes(limite = 15): Promise<VersaoGuia[]> {
  const snap = await HISTORICO.orderBy("substituidaEm", "desc").limit(limite).get();
  return snap.docs.map((d) => {
    const texto = (d.get("texto") as string) ?? "";
    return {
      id: d.id,
      caracteres: texto.length,
      trecho: texto.slice(0, 140),
      substituidaEm: iso(d.get("substituidaEm")),
      autor: (d.get("substituidaPor") as string | null) ?? null,
    };
  });
}

/** Volta uma versão antiga (a atual também vai para o histórico). */
export async function restaurarVersao(id: string, autor: string | null): Promise<boolean> {
  const snap = await HISTORICO.doc(id).get();
  const texto = snap.get("texto") as string | undefined;
  if (!snap.exists || !texto) return false;
  await salvarGuia(texto, autor ? `${autor} (restaurou)` : "restauração");
  return true;
}

/** O guia formatado para entrar no prompt da análise de reunião. */
export async function guiaReuniaoTexto(): Promise<string> {
  const { texto } = await lerGuia().catch(() => ({ texto: GUIA_PADRAO }));
  return [
    "GUIA DA REUNIÃO DE FECHAMENTO SIMPLIFICA (a régua oficial do time).",
    "Avalie o vendedor CONTRA este guia: o que cumpriu, o que pulou e o que",
    "fez fora de ordem. Ao apontar, cite a etapa pelo nome que o guia usa.",
    "",
    texto,
  ].join("\n");
}
