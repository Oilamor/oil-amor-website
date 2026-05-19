# Oil Amor Security Policy

## Secret Management

### Never Commit Secrets to Git

The following must **never** be committed to git:
- Stripe keys (`sk_live_*`, `sk_test_*`, `whsec_*`)
- Database connection strings (`postgres://` with passwords)
- API tokens (`SANITY_API_TOKEN`, `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN`)
- Password hashes and session secrets
- Private keys and certificates

### Where Secrets Live

| Environment | Location |
|-------------|----------|
| Local dev | `.env.local` (gitignored) |
| Production | Vercel Dashboard Environment Variables |
| CI/CD | GitHub Secrets / Vercel Environment Variables |

### Gitignore Rules

```
.env*.local
.env
.env.*
.env.production
```

### Pre-Commit Hook

Install the secret scanner to prevent accidental commits:

```bash
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

This blocks commits containing patterns like `whsec_*`, `sk_live_*`, `AKIA*`, etc.

### If a Secret is Exposed

1. **Rotate immediately** in the service dashboard (Stripe, Sanity, etc.)
2. Update the new secret in Vercel Dashboard
3. Update `.env.local` locally
4. Redeploy
5. Never force-push rewritten history to shared repos (breaks team workflow)

## Incident Response

| Severity | Example | Action |
|----------|---------|--------|
| Critical | `sk_live_*` exposed | Rotate within 1 hour |
| High | `whsec_*` exposed | Rotate within 4 hours |
| Medium | `pk_test_*` exposed | Rotate within 24 hours |

## Security Contacts

- GitGuardian monitors the repo for exposed secrets
- Enable 2FA on Stripe, Vercel, Sanity, and GitHub accounts
