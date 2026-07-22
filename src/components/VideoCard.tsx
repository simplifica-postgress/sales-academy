"use client";

import { useState } from "react";
import { youtubeEmbed, youtubeThumb } from "@/lib/video";
import type { VideoLesson } from "@/lib/types";

export type VideoRow = VideoLesson & { id: string };

/**
 * Card de vídeo no formato vertical (9:16) do design.
 *
 * O vídeo só carrega DEPOIS do clique: numa grade com muitos itens, carregar
 * todos de uma vez gastaria banda do Firebase à toa e deixaria a página lenta.
 * Antes do clique mostra só a capa.
 */
export default function VideoCard({
  video,
  onRemove,
  onEdit,
}: {
  video: VideoRow;
  onRemove?: () => void;
  onEdit?: () => void;
}) {
  const [tocando, setTocando] = useState(false);
  const ehYoutube = video.source === "youtube" && video.youtubeId;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        border: "1px solid rgba(120,150,210,.14)",
        borderTopColor: "rgba(150,175,235,.22)",
        background: "rgba(11,17,36,.55)",
        boxShadow: "0 22px 50px -32px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.05)",
        opacity: video.enabled === false ? 0.5 : 1,
      }}
    >
      <div className="relative bg-[#0a0f1e]" style={{ aspectRatio: "9 / 16" }}>
        {tocando ? (
          ehYoutube ? (
            <iframe
              src={`${youtubeEmbed(video.youtubeId!)}&autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              style={{ border: 0 }}
            />
          ) : (
            <video
              src={video.url}
              controls
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full bg-black object-contain"
            />
          )
        ) : (
          <>
            {ehYoutube ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={youtubeThumb(video.youtubeId!)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              // preload=metadata: o navegador busca só o primeiro quadro para
              // servir de capa, sem baixar o vídeo inteiro.
              <video
                src={video.url}
                preload="metadata"
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(5,8,17,.35) 0%, transparent 26%, transparent 52%, rgba(5,8,17,.85) 100%)" }}
            />
            <button
              onClick={() => setTocando(true)}
              aria-label={`Assistir: ${video.title}`}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full transition hover:scale-110"
                style={{ background: "rgba(10,15,30,.5)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.25)", boxShadow: "0 8px 24px -8px rgba(0,0,0,.8)" }}
              >
                <span
                  className="ml-1 block"
                  style={{ borderStyle: "solid", borderWidth: "9px 0 9px 15px", borderColor: "transparent transparent transparent #ffffff" }}
                />
              </span>
            </button>

            {video.source === "youtube" && (
              <span className="absolute left-3 top-3 rounded-lg px-2 py-1 text-[10.5px] font-bold text-white" style={{ background: "#ff0033" }}>
                YouTube
              </span>
            )}
            {video.enabled === false && (
              <span className="absolute left-3 top-3 rounded-lg bg-black/70 px-2 py-1 text-[10.5px] font-semibold text-muted">
                oculto
              </span>
            )}

            <div className="pointer-events-none absolute inset-x-3 bottom-3">
              <div className="line-clamp-2 text-[14px] font-bold leading-tight text-foreground">{video.title}</div>
              {video.description && (
                <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug" style={{ color: "#aeb9e6" }}>
                  {video.description}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {(onRemove || onEdit) && (
        <div className="absolute right-3 top-3 flex gap-1.5">
          {onEdit && (
            <button
              onClick={onEdit}
              title="Editar"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[12px] transition"
              style={{ border: "1px solid rgba(255,255,255,.16)", background: "rgba(5,8,17,.6)", backdropFilter: "blur(4px)", color: "#c4cffb" }}
            >
              ✎
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              title="Remover"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[14px] leading-none transition"
              style={{ border: "1px solid rgba(255,255,255,.16)", background: "rgba(5,8,17,.6)", backdropFilter: "blur(4px)", color: "#d2c3c3" }}
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
