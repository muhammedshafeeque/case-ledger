import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return {
    text: result.text?.trim() ?? "",
    pageCount: result.total ?? 0,
  };
}

export async function extractViaTesseract(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(getEnv().FORENSIC_TESSERACT_LANG);
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return data.text?.trim() ?? "";
  } catch (err) {
    logger.warn("Tesseract OCR failed", { error: String(err), mimeType });
    return "";
  }
}

export async function extractImageMetadata(buffer: Buffer): Promise<Record<string, unknown>> {
  try {
    const exifr = await import("exifr");
    const raw = await exifr.parse(buffer);
    const meta = raw ?? {};
    const pick = ["DateTimeOriginal", "GPSLatitude", "GPSLongitude", "Make", "Model"] as const;
    return Object.fromEntries(
      pick.filter((k) => k in meta).map((k) => [k, meta[k as keyof typeof meta]])
    ) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function extractViaCloudOcr(buffer: Buffer, mimeType: string): Promise<string> {
  const env = getEnv();
  if (!env.FORENSIC_OCR_ENABLED || !env.FORENSIC_OCR_API_URL) {
    return "";
  }
  try {
    const res = await fetch(env.FORENSIC_OCR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        ...(env.FORENSIC_OCR_API_KEY ? { Authorization: `Bearer ${env.FORENSIC_OCR_API_KEY}` } : {}),
      },
      body: buffer,
    });
    if (!res.ok) {
      logger.warn("Cloud OCR failed", { status: res.status });
      return "";
    }
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() ?? "";
  } catch (err) {
    logger.warn("Cloud OCR error", { error: String(err) });
    return "";
  }
}
