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

  // Lê como texto primeiro: se o proxy corta a conexão (análise de áudio longa),
  // o corpo vem vazio e res.json() estouraria com "Unexpected end of JSON input".
  const raw = await res.text();
  let data: { error?: string } = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      /* corpo não-JSON */
    }
  }
  if (!res.ok || !raw) {
    throw new Error(
      data.error ??
        (raw
          ? "Falha na operação."
          : "O servidor demorou demais e encerrou a conexão. Tente um arquivo menor ou mais curto.")
    );
  }
  return data as T;
}
