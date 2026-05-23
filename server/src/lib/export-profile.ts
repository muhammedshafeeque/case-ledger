export type ExportProfile = "full" | "redacted" | "publishable";

export function parseExportProfile(value?: string): ExportProfile {
  if (value === "redacted" || value === "publishable") return value;
  return "full";
}

export type ExportOptions = {
  full?: boolean;
  profile?: ExportProfile;
};

export function resolveExportOptions(opts?: ExportOptions): { full: boolean; profile: ExportProfile } {
  const profile = opts?.profile ?? (opts?.full ? "full" : "full");
  return {
    profile,
    full: profile === "full",
  };
}
