declare module "puppeteer-core" {
  const puppeteer: {
    default: {
      launch(opts?: Record<string, unknown>): Promise<{
        newPage(): Promise<{
          setContent(html: string, opts?: Record<string, unknown>): Promise<void>;
          pdf(opts?: Record<string, unknown>): Promise<Uint8Array>;
        }>;
        close(): Promise<void>;
      }>;
    };
  };
  export default puppeteer.default;
}

declare module "tesseract.js" {
  export function createWorker(lang?: string): Promise<{
    recognize(input: Buffer | string): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
  }>;
}

declare module "exifr" {
  export function parse(input: Buffer): Promise<Record<string, unknown>>;
}
