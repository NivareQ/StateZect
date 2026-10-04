# Contributing

Thanks for considering a contribution.

StateZect intentionally has a small local-first architecture.

Before a pull request:

- never include real user Backups, ProZect Packs, screenshots containing private project data, credentials, tokens, or local file-system paths;
- keep the app usable as a static PWA with no mandatory backend;
- preserve the Full Backup vs ProZect Pack vs Update Packet vs Bootstrap Packet safety distinctions;
- do not casually rename compatibility-sensitive IndexedDB/storage/interchange identifiers;
- keep destructive actions deliberate and clearly confirmed;
- do not add hidden telemetry or analytics;
- preserve licenses and attribution for any new third-party dependency or asset.

The public repository has no required build system. Runtime JavaScript should remain valid browser ES modules and should be tested in both normal browser and installed-PWA flows where relevant.
