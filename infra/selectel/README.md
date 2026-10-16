# Selectel MVP migration (single VDS)

**Status:** configuration only. Nothing in this directory provisions a paid server, migrates live data, switches DNS, or deletes Yandex Cloud resources.

## Scope and constraints

- Target: Ubuntu LTS VDS (start with **2 vCPU, 2 GiB RAM, 40 GiB SSD/NVMe**).
- All application runtime on one VDS: Next.js + PostgreSQL 16 + Caddy (HTTPS) via Docker Compose.
- Build the amd64 image in GitHub Actions, not on the small VDS.
- Do **not** add managed PostgreSQL, load balancer, API Gateway, or Kubernetes.
- Docker PostgreSQL is private: there is no published port 5432.
- `preview.vnutri.live` is an example. Use an actual DNS hostname you control.
- This is not high availability. Keep an independent offsite backup and test restoration.
- **Important:** GitHub `main` last reflected a May 2026 version when this migration was drafted. Check local unpushed changes and the newer `develop` branch before merging.

## Before touching DNS or Yandex Cloud

1. Inventory live resources in the Yandex Cloud console: Serverless Containers, Compute Cloud VMs, Managed PostgreSQL, Container Registry, API Gateway, Cloud DNS and certificates. The tracked repository has deployment references for Serverless Containers; the deployed inventory may differ.
2. Confirm whether your production users live in PostgreSQL or an older SQLite image. The repository's `docs/auth-storage-migration.md` explains the earlier SQLite-to-PG transition.
3. Take a fresh independent export **before** shutting down any Yandex resource. Example for existing managed PostgreSQL, from a machine with network access and suitable `pg_dump` version:

   ```bash
   # Configure credentials outside shell history, e.g., ~/.pgpass with mode 0600.
   pg_dump -Fc --no-owner --no-acl -h SOURCE_HOST -p SOURCE_PORT -U SOURCE_USER -d SOURCE_DB -f production.dump
   pg_restore -l production.dump | head
   ```

   Use a pg_dump client version equal to or newer than the source major version.
4. Keep the **Hyvor comments** and **browser localStorage posts** distinction in mind: a PostgreSQL dump does not contain those. Published topics are currently stored per browser in localStorage, not in the shared DB. They are not a functioning multi-user feed yet.
5. Existing staging/production workflows still target Yandex Cloud. Do not merge or reconfigure them casually. Pushing `main` may trigger a legacy YC production deployment.

## Build an application image (no server yet)

The workflow `.github/workflows/build-selectel-image.yml` publishes `linux/amd64` to:

```
ghcr.io/estenza/psy-prototype:selectel
```

It runs when relevant files change on `migration/selectel-mvp` and also supports manual dispatch once registered on the default branch. Check GitHub Actions for a green build and package availability. GHCR may create a **private** package by default: either deliberately make it public (the repository source is already public) or perform `docker login ghcr.io` on the VDS with a read:packages-only token. Never paste a token into files committed to GitHub.

## Provision and secure the VDS

1. Create **one** VDS in the Selectel account, choose Ubuntu LTS and a public IPv4. Confirm the full monthly quote (VDS, traffic/IP, extra services).
2. Log in with an SSH key. Restrict SSH by source IP when possible; allow inbound **TCP 80/443**; keep PostgreSQL private and never publish TCP 5432. Open UDP 443 if using HTTP/3.
3. Install Docker Engine and the Compose plugin from the [official Docker Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/).
4. Keep secrets on the VDS, not in the Git repository. Install updates and configure unattended security upgrades.

## Start a separate preview

```bash
git clone --depth 1 --branch migration/selectel-mvp https://github.com/estenza/psy-prototype.git
sudo mkdir -p /opt/vnutri
sudo cp psy-prototype/infra/selectel/{compose.yml,Caddyfile,.env.example,runtime.env.example,backup-postgres.sh} /opt/vnutri/
cd /opt/vnutri
sudo mv .env.example .env
sudo mv runtime.env.example runtime.env
sudo chmod 600 .env runtime.env
sudo chmod 700 backup-postgres.sh
```

Edit `/opt/vnutri/.env`:

- `SITE_DOMAIN`: a preview hostname already pointing to the new VDS IPv4 (A record).
- `APP_ENV=staging` for preview; later use `production`.
- Generate `POSTGRES_PASSWORD` with `openssl rand -hex 32`. **Never** leave the example placeholder value.
- Keep `APP_IMAGE` set to the image built by GitHub Actions.

In `runtime.env`, set the SMTP and Hyvor settings required by the features you intend to test. The service runs with `NODE_ENV=production` even in preview, so password reset requires functioning SMTP in both environments.

```bash
cd /opt/vnutri
sudo docker compose -f compose.yml config --quiet
sudo docker compose -f compose.yml pull
# Start only PostgreSQL if restoring existing user data.
sudo docker compose -f compose.yml up -d db
```

If importing a `pg_dump -Fc` export into a **new, empty** destination database:

```bash
cd /opt/vnutri
sudo docker compose -f compose.yml exec -T db sh -ec \
  'exec pg_restore --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /secure/location/production.dump
```

Avoid importing sensitive production user data into an openly accessible preview without access controls. Otherwise, start with an empty database.

```bash
sudo docker compose -f compose.yml up -d
sudo docker compose -f compose.yml ps
sudo docker compose -f compose.yml logs --tail=100 app proxy db
curl -I https://YOUR_PREVIEW_HOSTNAME
```

Caddy automatically obtains TLS only once DNS points to this VDS and ports 80/443 are reachable.

## Backup to an independent provider

`backup-postgres.sh` creates a PostgreSQL custom-format export and uploads it through an **rclone crypt** remote named `offsitecrypt:`. Configure `rclone` and its `crypt` remote to an **offsite account/provider in another geographical region**, not the VDS disk or the same data center.

Test manually:

```bash
sudo /opt/vnutri/backup-postgres.sh
sudo rclone lsf offsitecrypt:vnutri/
```

Then automate daily backups with root's crontab (for example, `0 3 * * * /opt/vnutri/backup-postgres.sh >> /var/log/vnutri-backup.log 2>&1`). Enforce your own retention policy on the remote (e.g., 14–30 daily backups), rotate/check alerts, and periodically **restore a backup into a fresh database**. A successful upload by itself does not prove recoverability. Backups may contain sensitive personal data: protect offsite access and encryption keys.

## Production cutover only after successful preview

1. Reconcile local/remote source versions and test registration, sign-in, email reset, comments, and database persistence. The current per-browser post storage must be redesigned before any meaningful multi-user pilot.
2. Make a final production DB export. Stop writes to old production during final sync.
3. Change `SITE_DOMAIN=vnutri.live`, `APP_ENV=production` and restart app/proxy via Compose.
4. Switch the DNS A record for `vnutri.live` to the VDS IPv4. Verify the registrar's active nameservers: if authoritative DNS remains in Yandex Cloud, moving app hosting does not eliminate the DNS dependency.
5. Handle `www.vnutri.live` separately: create its DNS record and Caddy redirect/certificate after the main hostname works.
6. Test HTTPS, login, writes, logs, and backup/restore. Keep the YC resources unchanged until verified.
7. Only after confirming the new deployment: disable old YC GitHub workflows, remove unnecessary paid YC resources and revoke unused service-account keys.

## Known blockers to product validation

- `src/features/feed/lib/published-posts.ts`: published posts are stored in browser localStorage; other users cannot see them.
- `src/features/comments/lib/hyvor-*.ts`: comments still depend on Hyvor, which may carry separate cost and data-access implications.
- `src/lib/db.ts`: `APP_ENV=production` or `staging` requires `AUTH_DATABASE_URL`; the Compose stack supplies it.
- The tracked `main` branch may not represent the final local version from summer 2026; reconcile with the MacBook source before production migration.

## Rollback

Until DNS cutover, no user-facing change is made. After cutover, return the DNS record to the old endpoint **only if the old endpoint is still working**, and consider any data written to the new DB since cutover before rolling back. Never delete the original database without a tested independent recovery copy.
