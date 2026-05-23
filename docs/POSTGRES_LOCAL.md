# Local PostgreSQL (no Docker, no PGlite)

## 1. Reinstall PostgreSQL (Ubuntu)

```bash
sudo apt update
sudo apt install --reinstall -y postgresql postgresql-contrib postgresql-client
sudo systemctl enable postgresql
sudo systemctl start postgresql
psql --version
```

## 2. Create RTI Watch database

```bash
cd /run/media/msp/XVD/Project/inv/server
sudo bash scripts/setup-postgres.sh
```

This creates:

- User: `rtiwatch` / password: `rtiwatch_dev`
- Database: `rti_watch`
- Extension: `pg_trgm`

## 3. Configure server

[`server/.env`](../server/.env) should contain (already set):

```env
DATABASE_URL=postgresql://rtiwatch:rtiwatch_dev@localhost:5432/rti_watch?connection_limit=10
```

Do **not** set `USE_PGLITE=true` when using real PostgreSQL.

## 4. Migrate and seed

```bash
cd server
npm run db:generate
npm run db:migrate
npx tsx prisma/seed.ts
npm run dev
```

## 5. Verify

```bash
psql "postgresql://rtiwatch:rtiwatch_dev@localhost:5432/rti_watch" -c "\dt"
curl http://localhost:3001/ready
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `role "msp" does not exist` | Use `rtiwatch` in URL, not your Linux username |
| `password authentication failed` | Re-run `sudo bash scripts/setup-postgres.sh` |
| `Peer authentication failed for user "postgres"` | Run setup script with `sudo`, not `psql -U postgres` as your user |
| Port 5432 in use | `ss -tlnp \| grep 5432` — stop duplicate Postgres instances |
