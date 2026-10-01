---
name: smartloc
description: Use when adding or changing user-facing text in a project that depends on the smartloc i18n library (tagged template strings, Express/GraphQL/React), or when generating and loading its translation files.
---

# smartloc

Read `AGENTS.md` at the root of the `smartloc` package (`node_modules/smartloc/AGENTS.md`) for the rules and API table. Full docs are in `node_modules/smartloc/docs/`:

- `api.md`: `loc`, plurals, locale resolution, other string kinds
- `cli.md`: `smartloc collect`, file format, loading
- `express.md`, `graphql.md`, `react.md`: integrations
- `storage.md`: persisting untranslated strings

## Workflow for new user-facing text

1. Write ``loc('namespace.id')`Text with ${placeholders}` `` in code. Never pre-translate or concatenate.
2. In React, render the `LocStr` directly; use `useAsString()` only for string-only props.
3. Run the project's collect script (look for `smartloc collect` in `package.json`), or `npx smartloc collect --format=json --locales=<locales> --defaultLocale=<default>`.
4. Fill the new `target` entries in `i18n/<locale>.json`. Leave `source` untouched.
5. Do not commit `i18n` if the project ignores it; check `.gitignore`.

## Quick checks

- `setDefaultLocale('xx')` must run once at startup, with a literal locale string.
- Translated output only appears inside `withLocales()`, the Express/GraphQL integrations, or React rendering.
- Plurals: `loc.plural(n)('id')`...``, and the default-locale file must be generated and loaded.
