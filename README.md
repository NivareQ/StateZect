# StateZect v1.0

**Know the state of your ProZects.**

StateZect is a local-first personal ProZect state tracker. It keeps the latest truth, History, Needs, one authoritative Next, and Guardrails together without turning every project into a giant task-management system.

> A NivareQ™ project

## What it tracks

- **Current state** — lifecycle, attention, stage, and current situation
- **History** — durable updates with correction, removed-entry recovery, and history hygiene
- **Needs** — lightweight items that need attention
- **Next** — one authoritative next Need
- **Guardrails** — protected decisions, constraints, and explicit gates
- **ProZect Briefs** — quick and fuller summaries derived from current data

Optional presets support Software, General, Writing, Making / Workshop, Film / Video, and Research while keeping one common model.

## Local-first

StateZect has no account system, cloud database, analytics SDK, or built-in telemetry.

Your ProZects, History, Needs, and Guardrails live in browser storage on your device. You can explicitly export and restore a Full Backup, or exchange selected portfolio data through a ProZect Pack.

StateZect can also generate provider-neutral prompts and structured JSON for work done elsewhere. It does **not** connect an AI provider directly to the local database. Update and Bootstrap packets are validated and shown in a Preview before mutation.

See [PRIVACY.md](PRIVACY.md).

## Data safety

StateZect deliberately separates:

- **Full Backup** — full-database recovery; restoring it replaces local StateZect data.
- **ProZect Pack** — non-destructive interchange; newer records win and the pack does not delete local records.
- **Update Packet** — reviewed update for an existing ProZect.
- **Bootstrap Packet** — reviewed creation of an existing ProZect from structured context.

Archive-before-delete and strong destructive confirmations are part of the normal product model.

## Themes

Day · Night · OLED · Dusk · Ocean · Forest · Ember · Plum · Sand

Night is the default.

## Install / run

StateZect is a static Progressive Web App. **There is no build step.**

1. Serve this repository from a static HTTPS host or `localhost`.
2. Open it in a modern browser.
3. Install / Add to Home Screen if you want the standalone PWA experience.

All runtime routes are relative, so repository-subpath hosting such as GitHub Pages is supported.

## Repository layout

```text
icons/                  PWA icons
src/app.js              UI and interaction layer
src/db.js               IndexedDB persistence
src/domain.js           domain rules and interchange validation
src/pwa-runtime.js       PWA update lifecycle
index.html               app shell
styles.css               styling and theme registry
manifest.webmanifest     PWA manifest
service-worker.js        offline/update shell
app-version.json         public release marker
```

Compatibility-sensitive storage and interchange identifiers are intentionally stable. Forks should not casually rename persisted database keys or packet format identifiers without a real migration.

## Version

This repository starts at **StateZect v1.0**, the first public open-source release.

Recommended Git tag: `v1.0.0`.

## License

Apache License 2.0. See [LICENSE](LICENSE).

Apache-2.0 does not grant trademark rights. See [TRADEMARKS.md](TRADEMARKS.md).

## Security

Do not post personal Backups or ProZect Packs in public issues. See [SECURITY.md](SECURITY.md).
