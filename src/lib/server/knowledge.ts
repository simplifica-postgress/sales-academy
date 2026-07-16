import "server-only";
import { adminDb } from "./firebaseAdmin";
import {
  METHODOLOGY_SUMMARY,
  SALES_KNOWLEDGE,
  formatKnowledge,
  type KnowledgeEntry,
} from "@/lib/knowledge";

/**
 * Lê a base de conhecimento do Firestore (coleção `knowledge`, editável pelo
 * painel do gestor). Se ainda não houver nada cadastrado, cai no conteúdo
 * inicial versionado em `lib/knowledge.ts`.
 */
export async function getKnowledgeText(): Promise<string> {
  try {
    const snap = await adminDb.collection("knowledge").get();
    const entries: KnowledgeEntry[] = snap.docs
      .filter((d) => d.get("enabled") !== false)
      .map((d) => ({
        title: (d.get("title") as string) ?? "",
        source: (d.get("source") as string) ?? undefined,
        content: (d.get("content") as string) ?? "",
        order: (d.get("order") as number) ?? 0,
      }))
      .filter((e) => e.title && e.content)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (entries.length > 0) return formatKnowledge(entries, METHODOLOGY_SUMMARY);
  } catch (err) {
    console.error("Falha ao ler a base de conhecimento do Firestore:", err);
  }
  // Fallback: conteúdo inicial do repositório.
  return formatKnowledge(SALES_KNOWLEDGE, METHODOLOGY_SUMMARY);
}
