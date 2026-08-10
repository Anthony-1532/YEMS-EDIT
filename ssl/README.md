# SSL / TLS Certificates — REPLACEMENT REQUIRED

The files that previously lived here (`yems.key`, `yems.crt`) were **committed
to Git history and are considered compromised.** They have been removed from
Git tracking but left on disk temporarily so the service does not break.

## You MUST replace them before/at deployment

1. **Revoke** the old certificate with the issuing CA.
2. Generate a brand-new private key and certificate:

   ```bash
   # Example: self-signed (dev only) — use a real CA for production
   openssl req -x509 -newkey rsa:4096 -nodes \
     -keyout yems.key -out yems.crt -days 365 \
     -subj "/CN=yems.local"
   ```

3. Deploy the new `yems.key` / `yems.crt` here (they are now git-ignored).
4. **Never** commit these files. The old compromised key must never be reused.

See `../SECURITY_BREACH_NOTICE.md` for full context and history-cleanup steps.
