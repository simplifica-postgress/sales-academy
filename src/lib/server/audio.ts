import "server-only";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

/** Limite do Whisper é 25 MB; deixamos margem. */
const MAX_CHUNK_BYTES = 24 * 1024 * 1024;
/** Duração de cada bloco quando é preciso dividir (segundos). */
const CHUNK_SECONDS = 600; // 10 min

export interface AudioChunk {
  /** mp3 mono comprimido, pronto para transcrição. */
  data: Buffer;
  filename: string;
}

if (!ffmpegPath) {
  throw new Error("ffmpeg-static não encontrou o binário do ffmpeg.");
}

async function ffmpeg(args: string[]): Promise<void> {
  await run(ffmpegPath as string, args, { maxBuffer: 1024 * 1024 * 64 });
}

/**
 * Recebe o arquivo enviado (áudio OU vídeo) e devolve um ou mais blocos de
 * áudio mp3 mono 16 kHz comprimidos, cada um abaixo do limite do Whisper.
 * Para vídeo, apenas a faixa de áudio é extraída (sem análise visual no MVP).
 */
export async function prepareAudioChunks(
  input: Buffer,
  originalName: string
): Promise<AudioChunk[]> {
  const workdir = await mkdtemp(join(tmpdir(), "sa-audio-"));
  try {
    const inputPath = join(workdir, originalName.replace(/[^\w.-]/g, "_"));
    await writeFile(inputPath, input);

    // Comprime para mp3 mono 16 kHz 32 kbps (ótimo para voz, arquivo pequeno).
    const compressedPath = join(workdir, "audio.mp3");
    await ffmpeg([
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "32k",
      "-y",
      compressedPath,
    ]);

    const compressed = await readFile(compressedPath);
    if (compressed.byteLength <= MAX_CHUNK_BYTES) {
      return [{ data: compressed, filename: "audio.mp3" }];
    }

    // Ainda grande (reunião muito longa): divide por tempo.
    const segPattern = join(workdir, "chunk_%03d.mp3");
    await ffmpeg([
      "-i",
      compressedPath,
      "-f",
      "segment",
      "-segment_time",
      String(CHUNK_SECONDS),
      "-c",
      "copy",
      "-y",
      segPattern,
    ]);

    const files = (await readdir(workdir))
      .filter((f) => f.startsWith("chunk_"))
      .sort();
    const chunks: AudioChunk[] = [];
    for (const f of files) {
      chunks.push({ data: await readFile(join(workdir, f)), filename: f });
    }
    return chunks;
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
