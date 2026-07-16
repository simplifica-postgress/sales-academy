import { auth } from "./firebase";

/**
 * Chama um endpoint /api/admin/* enviando o token do gestor.
 * Lança Error com a mensagem do backend quando a resposta não é ok.
 */
export async function adminPost<T = unknown>(
  path: string,
  body: unknown
): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Falha na operação.");
  }
  return data as T;
}
