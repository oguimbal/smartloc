# smartloc: instructions for AI coding agents

This file is for agents writing code that **uses** the `smartloc` package. It is shipped in the npm tarball, so it is readable from `node_modules/smartloc/AGENTS.md`. Detailed docs are in `node_modules/smartloc/docs/`.

## What it is

i18n via tagged template strings. `loc`...`` returns a `LocStr`: an immutable object that is translated lazily, when `.toString()`/`JSON.stringify` run inside a locale context, or when React renders it. Server (Express, Apollo GraphQL) and browser (React 19) are supported.

## Entry points

| Import | Exports |
|---|---|
| `smartloc` | `loc`, `setDefaultLocale`, `addLocale`, `changeLocale`, `removeLocale`, `clearLocales`, `getDefaultLocale`, `withLocales`, `singleLoc`, `multiLoc`, `joinArray`, `useAsString`, `isLocStr`, `loadJsonLocale`, `toJsonStorable`, `toLocalizable`, `jsonParseLocalized`, `translateObject`, `translateInContext`, `withSerializationContext`, types `LocStr`, `TranslationOf<T>`, `StorableOf<T>` |
| `smartloc/express` | default export: middleware factory `(options?) => RequestHandler` |
| `smartloc/graphql` | `GLocString`, `localizeSchema`, `localizedContext`, `localizedContextObject` |
| `smartloc/node` | `loadAllLocales(dir, merge?)`, `loadLocale(file, merge?)` (Node only, uses fs) |

## Rules

1. **Never build translated strings by hand.** Return `loc('id')`text ${value}`` and let the boundary translate. Do not call `.toString()` in business code unless you need a string for a log or a non-smartloc API.
2. **Always give an explicit ID** for anything a user sees: `loc('area.name')`...``. Auto IDs (``loc`...``) change when the text changes and lose translations. Use `.` to namespace IDs; the CLI groups files by the prefix before the first dot.
3. **Call `setDefaultLocale('xx')` once at startup**, before any translation. Use a literal string: the CLI reads it from the source.
4. **Placeholders**: strings, numbers, `Date`, other `LocStr`, React nodes. Numbers and dates are locale-formatted automatically, do not pre-format them. Do not concatenate `LocStr` with `+`; nest them as placeholders or use `joinArray`.
5. **Plurals**: `loc.plural(count)('id')`${count} items``. Count 1 uses the `singular` form from translation files. The default language singular is only in the default-locale file, generated with `--defaultLocale`.
6. **Express**: `app.use(smartloc())` before routes. `res.json()`, `res.jsonp()`, `res.send()` are then translated from `Accept-Language`. Pass `{ waitFor: promise }` when locales load asynchronously.
7. **GraphQL**: field type `GLocString`, `schema = localizeSchema(schema)`, `context: localizedContext(fn)`. `JSON`/`JSONObject` scalar fields are translated recursively too.
8. **React**: render a `LocStr` directly as a child (`<h1>{loc`...`}</h1>`). For string-only props (`placeholder`, `title`, `aria-*`) use `useAsString(locStr)` inside the component. Do not call `.toString()` during render: it does not re-render on `changeLocale()`.
9. **Translation files**: run `npx smartloc collect --format=json --locales=fr,de --defaultLocale=en` (writes `./i18n/<locale>.json`). Do not edit `source` fields; fill `target`. Load with `loadAllLocales('./i18n')` (Node) or `loadJsonLocale(url | object)` (browser). Prefer this over hand-written `addLocale` calls.
10. **Persisting `LocStr`** (DB, queues): `JSON.stringify(toJsonStorable(value))` to store, `toLocalizable(JSON.parse(text))` to restore. Plain `JSON.stringify` outside a serialization context translates to the default language and loses translatability. `transform()` and `joinArray()` results cannot be stored.
11. **Cloning**: `LocStr` are frozen objects tagged with a symbol. In deep clones, skip values where `isLocStr(v)` is true.
12. **Locale IDs**: `'fr'` or `'fr-FR'`, case-insensitive. `fr-FR` also serves requests for `fr` and `fr-CA` when no closer match exists.

## Minimal examples

```ts
// server bootstrap
import { setDefaultLocale } from 'smartloc';
import { loadAllLocales } from 'smartloc/node';
setDefaultLocale('en');
await loadAllLocales('./i18n');
```

```ts
// express
import smartloc from 'smartloc/express';
app.use(smartloc());
app.get('/', (req, res) => res.json({ message: loc('home.hello')`Hello ${req.query.name}` }));
```

```tsx
// react
const hint = useAsString(loc('search.hint')`Type to search`);
return <input placeholder={hint} aria-label={hint} />;
```

```ts
// test / one-off translation
withLocales(['fr'], () => msg.toString());
translateObject('fr', { title: loc('t')`Hi` });
```

## Translation file shape (JSON)

```json
{ "sourceLanguage": "en", "targetLanguage": "fr",
  "resources": { "home": { "hello": { "source": "Hello {0}", "target": "Bonjour {0}" } },
                 "cart":  { "items": { "source": { "singular": null, "plural": "{0} items" },
                                       "target": { "singular": "Un article", "plural": "{0} articles" } } } } }
```
