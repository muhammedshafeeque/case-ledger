import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

export type CasePermission =
  | "view"
  | "edit"
  | "add_evidence"
  | "export_full"
  | "export_redacted"
  | "manage_team";

const ROLE_DEFAULTS: Record<string, CasePermission[]> = {
  admin: ["view", "edit", "add_evidence", "export_full", "export_redacted", "manage_team"],
  investigator: ["view", "edit", "add_evidence", "export_full", "export_redacted"],
  analyst: ["view", "edit", "add_evidence"],
  legal: ["view", "export_full", "export_redacted"],
  journalist: ["view", "edit", "add_evidence", "export_redacted"],
};

export async function getCasePermissions(
  caseId: string,
  userId: string,
  role: string
): Promise<CasePermission[]> {
  if (role === "admin") return ROLE_DEFAULTS.admin;

  const c = await prisma.rtiCase.findUnique({ where: { id: caseId } });
  if (!c) throw AppError.notFound("Case not found");
  if (c.createdById === userId) return ROLE_DEFAULTS.investigator ?? ROLE_DEFAULTS.admin;

  const access = await prisma.caseAccess.findUnique({
    where: { caseId_userId: { caseId, userId } },
  });
  if (access?.permissions?.length) {
    return access.permissions as CasePermission[];
  }
  if (!c.isSensitive) return ROLE_DEFAULTS[role] ?? ["view"];
  throw AppError.forbidden("No access to sensitive case");
}

export async function assertCasePermission(
  caseId: string,
  userId: string,
  role: string,
  permission: CasePermission
) {
  const perms = await getCasePermissions(caseId, userId, role);
  if (!perms.includes(permission) && !perms.includes("manage_team")) {
    throw AppError.forbidden(`Missing permission: ${permission}`);
  }
}
