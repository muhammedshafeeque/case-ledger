# RTI Watch — Security (P10)

## Implemented

- JWT access tokens (15 min) + httpOnly refresh cookies
- bcrypt password hashing (cost 12)
- TOTP 2FA for investigator/admin
- Helmet security headers
- Rate limiting (100 req/min API, 30 req/min public)
- Zod input validation on all write endpoints
- Prisma parameterized queries (no raw unsafe SQL)
- Immutable audit log (no update/delete via Prisma extension)
- Case compartmentalisation (`is_sensitive` + `case_access`)
- CORS restricted to configured origins
- SHA-256 file hashing on upload

## Production checklist

- [ ] TLS 1.3 via Nginx + Let's Encrypt
- [ ] LUKS full-disk encryption on self-hosted server
- [ ] Rotate `JWT_SECRET` every 90 days
- [ ] Separate DB migration user vs app runtime user
- [ ] Fail2ban on SSH and HTTP
- [ ] Weekly backup restore drill (see DEPLOYMENT.md)
- [ ] `npm audit` in CI on every deploy

## Penetration test scope

- Auth bypass, IDOR on cases/documents
- SQL injection (should fail — Prisma only)
- XSS on knowledge text fields
- Rate limit bypass
