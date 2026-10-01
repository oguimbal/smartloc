# Storing untranslated strings

Sometimes a `LocStr` must be persisted (a DB record, a queue message) and translated later, when it is finally shown to a user.

## Store

```ts
import { loc, multiLoc, toJsonStorable } from 'smartloc';

const record = {
    title: loc('doc.title')`Report for ${customer}`,
    status: multiLoc({ en: 'Draft', fr: 'Brouillon' }),
    plain: 'Untouched',
};

const stored = JSON.stringify(toJsonStorable(record));
// {"title":{"i18n":"doc.title","data":["Acme"]},"status":{"i18n:en":"Draft","i18n:fr":"Brouillon"},"plain":"Untouched"}
```

`toJsonStorable` walks objects and arrays recursively. Plain values, `Date`s and nested `LocStr` placeholders are preserved. Plural counts are stored too.

`withSerializationContext(() => JSON.stringify(record))` does the same for a direct `JSON.stringify`.

### Stored forms

| Kind | Stored as |
|---|---|
| `loc` without placeholders | `"i18n/id:doc.title"` |
| `loc` with placeholders or plural | `{ "i18n": "doc.title", "data": [...], "count": n }` |
| `singleLoc` | `"i18n/single:text"` |
| `multiLoc` | `{ "i18n:en": "...", "i18n:fr": "..." }` |
| `transform()` / `joinArray()` | not supported, throws |

### Options

```ts
toJsonStorable(record, { nonSelfDescriptive: 'toMulti' });
```

- `'id'` (default): store the ID. The reader must have the same translations loaded.
- `'toMulti'`: expand into every loaded locale, stored as a `multiLoc`. Self-contained, but not updated when translations change.
- `'skip'`: leave `loc` strings as-is, so `JSON.stringify` translates them in the current locale.

## Restore

```ts
import { toLocalizable, jsonParseLocalized } from 'smartloc';

const record = toLocalizable(JSON.parse(stored));   // from a parsed value
const record = jsonParseLocalized(stored);          // from the JSON text
```

The result contains `LocStr` instances again, ready for `withLocales`, Express, GraphQL or React.

Restored `loc` strings no longer carry their in-code text. The default locale must therefore be loaded as a regular translation file (generate it with `smartloc collect --defaultLocale=en`, see [cli.md](cli.md)), otherwise translating them in the default language throws.

Dates become ISO strings through JSON and are not converted back.
