declare module "archiver" {
  import type { Transform } from "stream";

  export class ZipArchive extends Transform {
    constructor(options?: { zlib?: { level?: number } });
    append(
      source: Buffer | string,
      opts?: { name?: string }
    ): this;
    finalize(): Promise<void>;
  }
}
