# Privacy

StateZect is local-first.

## Stored on your device

- IndexedDB stores ProZects, History, Needs, Guardrails, and app metadata.
- `localStorage` stores the selected theme.
- `sessionStorage` is used only for the short-lived PWA update/reload guard.

## Network behavior

StateZect does not include an account system, analytics SDK, telemetry service, advertising SDK, or cloud database.

Normal application network requests are limited to same-origin static files plus the small `app-version.json` marker used by the update flow.

A hosting provider can still receive ordinary web-server request metadata such as IP address, user agent, and timestamps. That is controlled by the host, not by StateZect application code.

## Exports / imports

Backups, ProZect Packs, Update Packets, and Bootstrap Packets move only when you explicitly export, copy, paste, or import them.

A Full Backup can contain essentially all StateZect data. Treat exported files as private unless you intentionally share them.

## External AI or other services

StateZect can generate prompts and JSON for manual use elsewhere, but there is no direct AI-provider integration.

If you copy StateZect information into another service, that service's privacy and data-handling terms apply to what you share.

## Reset

Complete Reset deletes StateZect data held by the current browser/profile. Downloaded exports, browser/device backups, synced browser data, and copies shared elsewhere are outside the app's control.
