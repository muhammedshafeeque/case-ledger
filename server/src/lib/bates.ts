import { prisma } from "./prisma.js";

export function formatExhibitNumber(rtiId: string, seq: number): string {
  const safe = rtiId.replace(/[^a-zA-Z0-9-]/g, "");
  return `${safe}-EXH-${String(seq).padStart(3, "0")}`;
}

export function inferMediaKind(mimeType?: string | null, filename?: string | null): "document" | "image" | "audio" | "video" {
  const mime = mimeType ?? "";
  const name = filename?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic)$/.test(name)) return "image";
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|ogg)$/.test(name)) return "audio";
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|avi)$/.test(name)) return "video";
  return "document";
}

export async function assignExhibitForDocument(caseId: string, documentId: string, rtiId: string) {
  const existing = await prisma.document.findUnique({ where: { id: documentId }, select: { exhibitNumber: true } });
  if (existing?.exhibitNumber) return existing.exhibitNumber;

  const count = await prisma.document.count({ where: { caseId, exhibitNumber: { not: null } } });
  const exhibitNumber = formatExhibitNumber(rtiId, count + 1);
  const batesStart = exhibitNumber.replace(/-EXH-/, "-BATES-");

  await prisma.document.update({
    where: { id: documentId },
    data: { exhibitNumber, batesStart, batesEnd: batesStart },
  });
  return exhibitNumber;
}
