import { AppError } from "../../shared/errors/app-error.js";

const ALLOWED = new Set(["admin", "journalist", "legal"]);

export function requireSourceRole(role: string) {
  if (!ALLOWED.has(role)) {
    throw AppError.forbidden("Source vault requires journalist, legal, or admin role");
  }
}
