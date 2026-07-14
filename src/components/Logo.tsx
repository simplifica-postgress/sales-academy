import Image from "next/image";

/** Logo Simplifica (branca, para fundo escuro). Proporção ~4:1. */
export default function Logo({
  width = 160,
  className,
}: {
  width?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Simplifica — Aceleradora de Negócios"
      width={width}
      height={Math.round(width / 3.8)}
      style={{ width, height: "auto" }}
      className={className}
      priority
    />
  );
}
