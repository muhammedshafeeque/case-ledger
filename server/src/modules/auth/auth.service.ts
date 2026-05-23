import bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { authenticator } from "otplib";
import { getEnv } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";
import { userRepository } from "./repositories/user.repository.js";
import { refreshTokenRepository } from "./repositories/refresh-token.repository.js";
import type { LoginInput } from "./schemas/user.schema.js";

const BCRYPT_ROUNDS = 12;

export type AccessTokenPayload = { sub: string; email: string; role: string };

function getJwtSecret() {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(getEnv().JWT_ACCESS_EXPIRY)
    .sign(getJwtSecret());
}

function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function refreshTokenMaxAgeMs(): number {
  const raw = getEnv().JWT_REFRESH_EXPIRY.trim();
  const match = /^(\d+)([smhd])$/i.exec(raw);
  if (!match) return 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

export async function createRefreshToken(userId: string) {
  const raw = randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + refreshTokenMaxAgeMs());
  await refreshTokenRepository.create(userId, hashRefreshToken(raw), expiresAt);
  return raw;
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const r = await jwtVerify(token, getJwtSecret());
  return r.payload as AccessTokenPayload;
}

export async function login(input: LoginInput) {
  const user = await userRepository.findByEmail(input.email);
  if (!user || !user.isActive) throw AppError.unauthorized("Invalid credentials");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw AppError.unauthorized("Invalid credentials");

  if (user.totpEnabled) {
    if (!input.totpCode) throw AppError.badRequest("2FA code required", "TOTP_REQUIRED");
    const ok = authenticator.verify({ token: input.totpCode, secret: user.totpSecret! });
    if (!ok) throw AppError.unauthorized("Invalid 2FA code");
  }

  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });

  return {
    accessToken,
    user: userRepository.toResponse(user),
  };
}

export async function refreshSession(refreshToken: string) {
  const record = await refreshTokenRepository.findByHash(hashRefreshToken(refreshToken));
  if (!record) throw AppError.unauthorized("Invalid refresh token");

  const accessToken = await signAccessToken({
    sub: record.user.id,
    email: record.user.email,
    role: record.user.role,
  });

  return { accessToken, user: userRepository.toResponse(record.user) };
}

export async function logout(refreshToken: string) {
  const record = await refreshTokenRepository.findByHash(hashRefreshToken(refreshToken));
  if (record) await refreshTokenRepository.revoke(record.id);
}

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function getTotpUri(email: string, secret: string) {
  return authenticator.keyuri(email, getEnv().TOTP_ISSUER, secret);
}

export async function enableTotp(userId: string, code: string) {
  const user = await userRepository.findById(userId);
  if (!user?.totpSecret) throw AppError.badRequest("Setup TOTP first");
  const ok = authenticator.verify({ token: code, secret: user.totpSecret });
  if (!ok) throw AppError.badRequest("Invalid TOTP code");
  await userRepository.updateTotp(userId, user.totpSecret, true);
}

export async function setupTotp(userId: string) {
  const secret = generateTotpSecret();
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.notFound();
  await userRepository.updateTotp(userId, secret, false);
  return { secret, uri: getTotpUri(user.email, secret) };
}

export async function registerAdmin(email: string, password: string, name: string) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw AppError.conflict("Email already registered");
  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ email, passwordHash, name, role: "admin" });
  return userRepository.toResponse(user);
}
