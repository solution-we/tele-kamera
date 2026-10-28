# TeleKamera build roadmap

Source: `TELEKAMERA — COMPLETE WEBSITE & SECURE RELEASE MANAGEMENT SYSTEM` brief + reference design (Obsidian Glass).

## Done
- [x] Lovable Cloud enabled (database, auth, storage)
- [x] Email auth enabled; public signup disabled; HIBP + current-password checks on
- [x] Private storage bucket `releases` (1 GB/file limit)
- [x] Bootstrap secrets `ADMIN_INITIAL_EMAIL` / `ADMIN_INITIAL_PASSWORD` stored server-side
- [x] Obsidian Glass design tokens + product mockup assets cropped from reference

## In progress
- [ ] Database schema: releases, user_roles + has_role, admin_security, admin_audit_log, bootstrap_state; storage RLS
- [ ] Public site: home, features, how-to-use, screenshots, faq, privacy, terms
- [ ] Public downloads: /downloads archive, latest + per-release download endpoints (server route streaming from storage)
- [ ] Admin: /auth sign-in, one-time bootstrap flow, forced password change, /admin dashboard
- [ ] Admin release management: upload (direct-to-storage with progress), server-side SHA-256 + size + magic-byte validation, draft/publish/unpublish/archive/delete, replace binary, audit log
- [ ] SEO: per-route head metadata, sitemap.xml, robots.txt
- [ ] Tests: latest-stable resolution, publication rules, validation
- [ ] E2E verification with Playwright (auth, upload flow, downloads, drafts hidden)
- [ ] README (deployment, env vars, bootstrap steps — no credentials)

## Notes
- Admin bootstrap: run once from /auth → deletes `ADMIN_INITIAL_PASSWORD` secret, forces password change on first login.
- Windows installers: .exe (MZ magic) or .msi (OLE D0 CF 11 E0 magic); APK: ZIP magic PK\x03\x04.
