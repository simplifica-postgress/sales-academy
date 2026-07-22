/**
 * Utilidades de vídeo das aulas.
 *
 * O app aceita duas origens:
 *  - `upload`  → arquivo no nosso Storage, toca nativo com <video>.
 *  - `youtube` → link do YouTube, toca embutido e a capa vem de graça.
 *
 * Instagram ficou de fora de propósito: a plataforma bloqueia reprodução em
 * iframe e não entrega a capa sem app aprovado no Facebook. O caminho para
 * conteúdo do Instagram é baixar o arquivo e enviar aqui como upload.
 */

/** Extrai o id do vídeo de qualquer formato de link do YouTube. */
export function youtubeId(url: string): string | null {
  const limpo = url.trim();
  if (!limpo) return null;
  const padroes = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of padroes) {
    const m = limpo.match(p);
    if (m) return m[1];
  }
  // O próprio id colado direto.
  if (/^[A-Za-z0-9_-]{11}$/.test(limpo)) return limpo;
  return null;
}

/** Capa do vídeo do YouTube (não precisa de API nem token). */
export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** URL de reprodução embutida, sem vídeos relacionados de terceiros no fim. */
export function youtubeEmbed(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

/** Formata segundos como 1:05. */
export function duracao(segundos?: number | null): string {
  if (!segundos || segundos < 1) return "—";
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
