import type { User, UserRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";

export class UserRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; passwordHash: string; name: string; role: UserRole }) {
    return prisma.user.create({ data });
  }

  updateTotp(id: string, secret: string | null, enabled: boolean) {
    return prisma.user.update({
      where: { id },
      data: { totpSecret: secret, totpEnabled: enabled },
    });
  }

  updatePreferences(id: string, data: { workspaceMode?: string; preferences?: object }) {
    return prisma.user.update({
      where: { id },
      data: {
        workspaceMode: data.workspaceMode,
        preferences: data.preferences as never,
      },
    });
  }

  toResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      totpEnabled: user.totpEnabled,
      locale: user.locale,
      workspaceMode: user.workspaceMode,
      preferences: user.preferences,
    };
  }
}

export const userRepository = new UserRepository();
