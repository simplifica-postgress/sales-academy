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

/**
 * Formatos que o Whisper já aceita direto. Se o envio for um destes e couber
 * no limite, não passamos pelo ffmpeg — é mais rápido e evita depender do
 * binário para o caso mais comum (áudio de ligação).
 */
const WHISPER_NATIVE_MIME: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/flac": "flac",
};

export interface AudioChunk {
  /** Áudio pronto para transcrição. */
  data: Buffer;
  filename: string;
}

async function ffmpeg(args: string[]): Promise<void> {
  if (!ffmpegPath) {
    throw new Error(
      "ffmpeg não encontrado no servidor — necessário para vídeo ou áudio muito grande."
    );
  }
  await run(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 64 });
}

/**
 * Prepara o arquivo para transcrição.
 *
 * Caminho rápido: áudio em formato nativo do Whisper e dentro do limite vai
 * direto, sem ffmpeg.
 * Caminho completo (vídeo, formato exótico ou arquivo grande): o ffmpeg extrai
 * a faixa de áudio, comprime para mp3 mono 16 kHz e, se ainda passar do limite,
 * divide em blocos por tempo.
 */
export async function prepareAudioChunks(
  input: Buffer,
  originalName: string,
  mimeType = ""
): Promise<AudioChunk[]> {
  const nativeExt = WHISPER_NATIVE_MIME[mimeType.toLowerCase()];
  if (nativeExt && input.byteLength <= MAX_CHUNK_BYTES) {
    const name = /\.[a-z0-9]+$/i.test(originalName)
      ? originalName
      : `${originalName}.${nativeExt}`;
    return [{ data: input, filename: name }];
  }

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
