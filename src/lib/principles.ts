import type { KnowledgeEntry } from "./knowledge";

/**
 * Princípios e Casos — o material que alimenta a IA e que o vendedor lê.
 *
 * A numeração é a MESMA nos dois lugares (prompt e tela) porque sai daqui.
 * Isso é o ponto central: a análise cita "Princípio 12", e esse 12 precisa
 * apontar para o mesmo item que o vendedor encontra na seção. Se cada lado
 * numerasse por conta própria, a citação levaria ao princípio errado — pior
 * do que não citar nada.
 */

export type PrincipleKind = "principio" | "caso";

export interface PrincipleEntry extends KnowledgeEntry {
  id?: string;
  kind?: PrincipleKind;
  enabled?: boolean;
}

/** Entrada já numerada, pronta para exibir ou injetar no prompt. */
export interface NumberedPrinciple extends PrincipleEntry {
  number: number;
}

/**
 * Ordena, descarta o que está desativado e numera.
 * Fonte única de verdade da numeração — usada pelo prompt e pela tela.
 */
export function numberPrinciples(
  entries: PrincipleEntry[]
): NumberedPrinciple[] {
  return entries
    .filter((e) => e.enabled !== false && e.title && e.content)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((e, i) => ({ ...e, number: i + 1 }));
}

/** "caso" quando a entrada documenta um atendimento real; senão "princípio". */
export function kindOf(e: PrincipleEntry): PrincipleKind {
  if (e.kind) return e.kind;
  // Heurística para o material antigo, cadastrado antes do campo existir.
  const t = (e.title ?? "").toLowerCase();
  return t.includes("atendimento de referência") || t.includes("caso")
    ? "caso"
    : "principio";
}
