# Telegram_Anwer Operations Runbook

**Service Name**: Telegram_Anwer  
**Primary Port**: 3000  
**Repository**: `/`  
**Primary Maintainer**: DevOps & Infrastructure Team  

---

## 1. Architecture Overview

Telegram_Anwer is an advanced, high-performance Telegram MTProto web client and automation bot.
Key components:
- **Application Server**: Node.js + Express + Socket.IO (`server.ts`)
- **MTProto Engine**: GramJS client connected to official Telegram DCs (DC1-DC5)
- **Persistence Layer**:
  - `data/bot_storage.sqlite`: Automation rules, batch messages, link radar logs, cached messages
  - `sessions/account_{0..3}.json`: Isolated Telegram MTProto authorization tokens
- **In-Memory Cache**: Tier 1.5 LRU Cache (`server/redisCacheService.ts`)
- **Security Middleware**: Helmet headers, dynamic CORS, HMAC-signed session cookies, CSRF protection, and rate limiting (`server/security/middleware.ts`)

---

## 2. Health Checks & Diagnostics

| Component | Endpoint / Method | Expected Output |
|---|---|---|
| HTTP Health | `GET /api/health` | `{"status":"ok","timestamp":...}` |
| Environment & Config | `GET /api/env/info` | Masked API credentials, Node env, status |
| Cache Tier 1.5 Stats | `GET /api/cache/stats` | Hits, misses, keys count, hit ratio |
| CSRF Token | `GET /api/csrf-token` | `{"success":true,"csrfToken":"..."}` |
| Local DB Check | `sqlite3 data/bot_storage.sqlite "PRAGMA integrity_check;"` | `ok` |

---

## 3. Backup Management (`scripts/backup.sh`)

> **Golden Rule**: Always trigger `./scripts/backup.sh` immediately before any manual configuration changes, package upgrades, or database schema alterations.

### 3.1 Running a Manual Backup
```bash
# Basic local snapshot + session archive
./scripts/backup.sh

# Specifying custom GCS bucket for off-site replication
GCS_BUCKET="gs://my-telegram-backups" ./scripts/backup.sh

# With GPG encryption enabled
GPG_PASSPHRASE="your_secure_passphrase" ./scripts/backup.sh
```

### 3.2 Backup Contents
Archives are written to `.backups/telegram_backup_YYYYMMDD_HHMMSS.tar.gz` and contain:
1. `bot_storage.sqlite` (hot crash-consistent snapshot produced via `VACUUM INTO`)
2. `sessions/account_*.json` (all multi-account MTProto sessions)
3. `backup_manifest.json` (timestamp, commit hash, hostname, metadata)
4. Accompanying `.sha256` checksum file

---

## 4. Disaster Recovery & Restore Drill (`scripts/restore-drill.sh`)

### 4.1 Running a Non-Destructive Restore Drill
To verify the integrity of the latest backup archive without modifying production files:
```bash
./scripts/restore-drill.sh --dry-run
```

### 4.2 Restoring from a Backup Archive
```bash
# 1. Stop active application or drain traffic
# 2. Execute verification drill on target archive
./scripts/restore-drill.sh .backups/telegram_backup_20260914_050000.tar.gz

# 3. Unpack database and sessions into live paths:
cp .backups/drill_*/extracted/bot_storage.sqlite data/bot_storage.sqlite
cp -r .backups/drill_*/extracted/sessions/* sessions/

# 4. Restart service
npm start
```

---

## 5. Regional Failover (`scripts/failover-to-secondary.sh`)

If the primary deployment becomes unresponsive, run:
```bash
# Check primary health and perform automated failover
./scripts/failover-to-secondary.sh

# Force failover immediately without health check wait
./scripts/failover-to-secondary.sh --force
```

---

## 6. Incident Response Playbooks

### Incident A: Memory Spike / Out of Memory (OOM)
- **Symptom**: `Aborted(OOM)` or container memory > 85%.
- **Root Cause**: Excessive in-memory cached messages or unvacuumed SQLite database.
- **Action**:
  1. Trigger SQLite vacuuming:
     ```bash
     sqlite3 data/bot_storage.sqlite "VACUUM;"
     ```
  2. Clear client-side cache by restarting or executing client db cleanup.
  3. Verify `rateLimit` is not letting unbounded crawler requests through.

### Incident B: MTProto Disconnection or FLOOD_WAIT
- **Symptom**: GramJS logs `RPCError 420: FLOOD_WAIT_X`.
- **Action**:
  1. GramJS automatically backs off for the duration specified by Telegram.
  2. Avoid restarting the server repeatedly, as reconnection attempts increase flood ban penalties.
  3. Inspect `LinkRadar` and `batch_messages` rate settings to reduce join/send frequency.

### Incident C: Telegram Session Revocation
- **Symptom**: `SESSION_REVOKED` or `AUTH_KEY_UNREGISTERED`.
- **Action**:
  1. Remove expired session file: `rm sessions/account_{INDEX}.json`.
  2. Prompt operator to re-authenticate via the web interface login modal.
  3. Verify other account sessions remain operational.
