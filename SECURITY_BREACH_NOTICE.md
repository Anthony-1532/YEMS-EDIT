# SECURITY BREACH NOTICE

**Status:** ACTION REQUIRED
**Date filed:** 2026-08-04

Sensitive files were committed to this repository's Git history. Removing them
from the current working tree is **not sufficient** — they remain recoverable
from prior commits until the history is rewritten. Until the remediation steps
below are completed, treat all listed secrets as **compromised**.

---

## 1. Exposed assets and required remediation

### 1.1 TLS private key — `ssl/yems.key`
- The server's TLS private key was committed to the repository.
- **Impact:** Anyone with repo (or history) access can impersonate the server
  and decrypt intercepted TLS traffic.
- **Required action:**
  - [ ] **Revoke** the current certificate (`ssl/yems.crt`) with the issuing CA.
  - [ ] **Generate a new private key and CSR**, and issue a **new certificate**.
  - [ ] Deploy the new key/cert to all servers; remove the old ones.
  - [ ] The compromised key must **never** be reused.

### 1.2 Student credentials — `students.csv` (465 plaintext passwords)
- `students.csv` contained a `Password` column with **465 plaintext passwords**
  (plus PII: names, emails, phone numbers, addresses, DOB, parent contacts).
- **Impact:** Full account takeover for all 465 students; PII disclosure.
- **Required action:**
  - [ ] **Rotate (force-reset) all 465 student passwords** immediately.
  - [ ] Invalidate all existing student sessions/tokens.
  - [ ] Ensure passwords are only ever stored **hashed** (e.g. bcrypt/argon2),
        never in plaintext or in any exported file.
  - [ ] Assess PII disclosure against applicable data-protection obligations and
        notify affected parties if required.

### 1.3 Redis dumps — `dump.rdb`, `packages/browser/dump.rdb`
- Redis snapshot files were committed. These commonly contain session tokens,
  cache entries, rate-limit state, and other transient secrets.
- **Impact:** Possible leakage of live session/auth tokens.
- **Required action:**
  - [ ] **Inspect the dumps** for leaked tokens, sessions, or credentials
        (e.g. `redis-check-rdb dump.rdb`, or load into an isolated Redis and
        `SCAN` the keyspace).
  - [ ] **Invalidate/rotate** any tokens or session keys found.

### 1.4 Other committed sensitive files
- `admin.html.backup` and `.~lock.students.csv#` were also tracked and have
  been removed from the working tree.

---

## 2. Git history cleanup (REQUIRED)

The steps above only remove secrets going forward. To purge them from **all
past commits**, rewrite history using **one** of the following tools. This is a
destructive, force-push operation — coordinate with the whole team first,
ensure everyone has pushed their work, and take a backup clone of the repo.

> After rewriting, **all collaborators must re-clone** (or hard-reset) — old
> clones and any forks still contain the secrets.

### Option A — `git filter-repo` (recommended)

```bash
# Install: pip install git-filter-repo  (or: brew install git-filter-repo)

# From a fresh clone of the repo:
git clone --mirror <repo-url> yems-cleanup.git
cd yems-cleanup.git

# Purge the sensitive files from ALL history
git filter-repo --invert-paths \
  --path ssl/yems.key \
  --path ssl/yems.crt \
  --path students.csv \
  --path dump.rdb \
  --path packages/browser/dump.rdb \
  --path admin.html.backup \
  --path ".~lock.students.csv#"

# Also purge by pattern (any stray dumps/backups across history)
git filter-repo --invert-paths --path-glob '*.rdb'
git filter-repo --invert-paths --path-glob '*.backup'

# Force-push the rewritten history
git push --force --all
git push --force --tags
```

### Option B — BFG Repo-Cleaner

```bash
# Download bfg.jar from https://rtyley.github.io/bfg-repo-cleaner/

git clone --mirror <repo-url> yems-cleanup.git

# Delete specific files anywhere in history
java -jar bfg.jar --delete-files '{yems.key,yems.crt,students.csv,dump.rdb,admin.html.backup}' yems-cleanup.git

# Or delete by pattern
java -jar bfg.jar --delete-files '*.{rdb,backup}' yems-cleanup.git

cd yems-cleanup.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

git push --force --all
git push --force --tags
```

> **Note:** Even after history rewrite, assume every secret above has already
> been exposed. Rotation/revocation (Section 1) is mandatory regardless — do
> not rely on history cleanup alone.

---

## 3. Remediation checklist summary

- [ ] TLS certificate revoked and reissued with a new private key
- [ ] All 465 student passwords force-reset; sessions invalidated
- [ ] Redis dumps inspected; any leaked tokens rotated
- [ ] Sensitive files removed from working tree (done)
- [ ] `.gitignore` / `.dockerignore` updated to prevent recurrence (done)
- [ ] Git history purged via filter-repo/BFG and force-pushed
- [ ] All collaborators re-cloned; forks addressed
- [ ] PII disclosure assessed and reported as required
