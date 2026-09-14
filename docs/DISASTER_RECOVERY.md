# Telegram_Anwer Disaster Recovery (DR) Plan

**Version**: 1.0  
**Status**: Approved & Operational  
**Last Reviewed**: 2026-09-14  

---

## 1. Objectives & Metrics

| Metric | Target | Description |
|---|---|---|
| **RPO** (Recovery Point Objective) | **<= 1 Hour** | Maximum tolerable data loss duration in case of catastrophic storage loss. |
| **RTO** (Recovery Time Objective) | **<= 15 Minutes** | Maximum allowable downtime before service is restored in secondary region. |

---

## 2. Backup Strategy & Scheduling

1. **Snapshot Mechanism**:
   - SQLite atomic copy via `VACUUM INTO` ensuring zero database lock contention.
   - Tarball archive containing database snapshot + MTProto session files (`sessions/account_*.json`).
   - SHA256 checksum generation for tamper and corruption detection.

2. **Replication Schedule**:
   - **Hourly**: Local atomic snapshots retained in `.backups/`.
   - **Daily (02:00 UTC)**: Encrypted backup uploaded to off-site cloud storage (`gs://telegram-anwer-backups`).
   - **Retention**: Local backups pruned after 7 days; cloud backups transitioned to Nearline/Coldline after 30 days.

---

## 3. Disaster Scenarios & Recovery Playbooks

### Scenario 1: SQLite Storage Corruption
*Detection: SQLite throws `database disk image is malformed` or integrity check fails.*

1. Stop server process to prevent partial writes:
   ```bash
   pkill -f "node.*server"
   ```
2. Locate the most recent healthy backup archive:
   ```bash
   ./scripts/restore-drill.sh --dry-run
   ```
3. Backup corrupt database file for forensics:
   ```bash
   mv data/bot_storage.sqlite data/bot_storage.sqlite.corrupt.$(date +%s)
   ```
4. Restore clean database from the verified archive:
   ```bash
   ./scripts/restore-drill.sh
   ```
5. Restart application and verify `/api/health`.

---

### Scenario 2: Primary Cloud Region Outage
*Detection: Cloud Monitoring alert triggers on consecutive health check probe failures.*

1. Execute regional failover script:
   ```bash
   ./scripts/failover-to-secondary.sh --force
   ```
2. In secondary region:
   - Ensure the latest GCS backup archive is pulled and restored:
     ```bash
     gsutil cp gs://telegram-anwer-backups/latest.tar.gz .backups/
     ./scripts/restore-drill.sh .backups/latest.tar.gz
     ```
   - Start the secondary container on port 3000.
3. Update DNS routing (Cloudflare / Cloud DNS) to point domain to secondary IP.
4. Validate MTProto client connection and Link Radar status.

---

### Scenario 3: Accidental Deletion of Automation Rules or Batch Records
*Detection: Operator error or script bug causes loss of critical automation data.*

1. Extract database from the latest pre-incident backup archive to a temporary inspection path:
   ```bash
   ./scripts/restore-drill.sh .backups/telegram_backup_TARGET.tar.gz
   ```
2. Export missing tables or rows using SQLite:
   ```bash
   sqlite3 .backups/drill_*/extracted/bot_storage.sqlite ".dump automation_rules" > rules_restore.sql
   sqlite3 data/bot_storage.sqlite < rules_restore.sql
   ```
3. Verify rules appear in the admin UI.

---

### Scenario 4: Compromised Session Secret or Stolen Account Keys
*Detection: Suspicious unauthorized API activity or security audit finding.*

1. Immediately stop the server.
2. Invalidate existing sessions:
   ```bash
   rm -f sessions/account_*.json
   ```
3. Rotate `SESSION_SECRET` in environment variables.
4. Start server and re-authenticate Telegram accounts through official 2FA SMS/Telegram code login.
5. In Telegram Settings -> Devices, terminate all unknown active sessions.

---

## 4. Verification & Routine Testing

To maintain continuous disaster readiness:
- **Weekly Automated Drill**: Run `./scripts/restore-drill.sh --dry-run` via cron every Monday at 04:00 UTC.
- **Quarterly Full Drill**: Conduct an end-to-end failover test in a staging environment.
