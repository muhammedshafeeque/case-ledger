import { getEnv } from "../config/env.js";
import { logger } from "./logger.js";

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  try {
    const puppeteer = await import("puppeteer-core");
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  } catch (err) {
    logger.error("PDF generation failed", { error: String(err) });
    throw new Error(
      "PDF generation unavailable. Install Chromium or set PUPPETEER_EXECUTABLE_PATH in server/.env"
    );
  }
}

export function isPdfAvailable(): boolean {
  return Boolean(process.env.PUPPETEER_EXECUTABLE_PATH || getEnv().NODE_ENV === "development");
}
