import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Porta da ferramenta interna de reuniões.
 *
 * NÃO é sistema de contas: é uma senha só, igual para o time todo. O que
 * guardamos no navegador é um comprovante ASSINADO, não a senha — assim
 * ninguém forja o acesso editando o cookie, e a senha não fica gravada na
 * máquina de ninguém.
 */

const COOKIE = "reunioes_acesso";
const VALIDADE_DIAS = 30;

function segredoAssinatura(): string {
  // Deriva do próprio segredo da senha: um segredo a menos para gerenciar.
  const s = process.env.REUNIOES_SENHA;
  if (!s) throw new Error("REUNIOES_SENHA não definida no servidor.");
  return s;
}

/** Comprovante = validade + assinatura da validade. */
function assinar(expiraEm: number): string {
  const mac = createHmac("sha256", segredoAssinatura())
    .update(String(expiraEm))
    .digest("hex");
  return `${expiraEm}.${mac}`;
}

function comprovanteValido(valor: string | undefined): boolean {
  if (!valor) return false;
  const [expiraTxt, mac] = valor.split(".");
  const expiraEm = Number(expiraTxt);
  if (!expiraEm || !mac || Date.now() > expiraEm) return false;
  const esperado = createHmac("sha256", segredoAssinatura())
    .update(expiraTxt)
    .digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(esperado, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Compara a senha digitada em tempo constante. Comparar com === vazaria,
 * pelo tempo de resposta, quantos caracteres iniciais estão certos.
 */
export function senhaConfere(digitada: string): boolean {
  const certa = process.env.REUNIOES_SENHA ?? "";
  if (!certa) return false;
  const a = Buffer.from(digitada.trim());
  const b = Buffer.from(certa);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Grava o comprovante depois que a senha bateu. */
export async function darAcesso(): Promise<void> {
  const expiraEm = Date.now() + VALIDADE_DIAS * 86_400_000;
  const jar = await cookies();
  jar.set(COOKIE, assinar(expiraEm), {
    httpOnly: true, // fora do alcance de qualquer script na página
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VALIDADE_DIAS * 86_400,
  });
}

export async function tirarAcesso(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Esta requisição pode usar a ferramenta? */
export async function temAcesso(): Promise<boolean> {
  const jar = await cookies();
  return comprovanteValido(jar.get(COOKIE)?.value);
}

/** A ferramenta está configurada neste ambiente? */
export function reunioesLigado(): boolean {
  return Boolean(process.env.REUNIOES_SENHA);
}
