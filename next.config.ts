import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static resolve o caminho do binário com __dirname. Se o Next
  // empacotar o módulo, esse caminho quebra (vira "\ROOT\node_modules\...")
  // e o spawn falha com ENOENT. Marcando como externo, o Node faz require
  // nativo e o binário é encontrado.
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
