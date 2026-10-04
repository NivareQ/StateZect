# Security

## Reporting

Do not open a public issue for a vulnerability that could expose user data or enable destructive behavior.

Use GitHub private vulnerability reporting when it is enabled for this repository. Otherwise, use the contact information published at `nivareq.com`.

Do not attach real personal Backups or ProZect Packs to public issues.

## Security model

StateZect is a static local-first PWA with no application server, login system, remote database, or built-in analytics service.

Its main trust boundaries are:

- the static origin that serves the app;
- the browser profile/device that stores local data;
- files and packets the user explicitly imports;
- any external service to which the user manually copies exported information.

Structured interchange is validated before mutation, and the major Update / Bootstrap flows include human Preview boundaries.

## Imports

Full Backup restore intentionally replaces the local StateZect database after confirmation.

A ProZect Pack performs a non-destructive merge.

Keep a recent Backup before major data changes and only import files you intend to trust.

## Forks

Compatibility-sensitive IndexedDB names, storage keys, and packet identifiers are part of the persistence boundary. Renaming them without a migration can strand existing data.
