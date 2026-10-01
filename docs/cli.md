# CLI: collecting and loading translations

## `smartloc collect`

Scans your sources for `loc` strings and writes one translation file per locale.

```bash
npx smartloc collect --format=json --locales=fr,de --defaultLocale=en
```

| Option | Default | Description |
|---|---|---|
| `--locales` | required | Comma-separated locales to generate, other than the default one. |
| `--defaultLocale` | inferred | Language of the in-code text. Inferred from `setDefaultLocale('xx')` in sources when omitted. When given, also writes the default-locale file (needed for plurals and for stored strings, see below). |
| `--format` | `xliff` | `json` or `xliff`. |
| `--outDir` | `i18n` | Output directory. |
| `--source` | `.` | Directory to scan. `.js`, `.ts`, `.jsx`, `.tsx` files; `.gitignore` is honored. |
| `--additionalSimpleTag` | | Also collect strings matching a pattern, `*` being the string. Example: `Named<*>` collects `Named<'text'>`. |

Add it to `package.json` and run it whenever code changes:

```json
{ "scripts": { "i18n": "smartloc collect --format=json --locales=fr,de --defaultLocale=en" } }
```

### What a run does

- New strings are added with an empty `target`.
- Strings that disappeared from code are removed. If a string with the same text reappears under another ID, its translation is moved.
- Strings whose source text changed keep their translation but are marked `"dirty": true`.
- The command prints, per locale, how many translations are missing, dirty, or identical to the source.

### File format (JSON)

`i18n/fr.json`:

```json
{
    "sourceLanguage": "en",
    "targetLanguage": "fr",
    "resources": {
        "$default": {
            "sha1.b128...": { "source": "Auto id", "target": null }
        },
        "cart": {
            "items": {
                "source": { "singular": null, "plural": "{0} items" },
                "target": { "singular": "Un article", "plural": "{0} articles" }
            }
        }
    }
}
```

- IDs are grouped by namespace: the part before the first `.`. Strings without a dot go under `$default`.
- Fill in `target`. A `null` target falls back to the next locale, then to the default language.
- Plural entries hold `{ singular, plural }`. `singular` is used when the count is exactly 1.
- `--format=xliff` writes the same data as XLIFF. JSON is the recommended format: the XLIFF writer currently uses the `.json` extension, which the loaders do not recognize as XLIFF.

## Loading translations

### Node

```ts
import { loadAllLocales, loadLocale } from 'smartloc/node';

await loadAllLocales('./i18n');              // every file in the directory
await loadLocale('./i18n/fr.json');          // one file
await loadAllLocales('./more', true);        // merge into already loaded locales
```

Without `merge`, loading a locale that already exists throws.

### Browser

```ts
import { loadJsonLocale } from 'smartloc';

await loadJsonLocale('/i18n/fr.json');       // fetch() then register
loadJsonLocale(importedJsonObject);          // or pass the parsed object
```

### Default locale file

Load the default-locale file too (`i18n/en.json`) when you use plurals, or when you deserialize stored strings (see [storage.md](storage.md)). It is the only place holding the singular form of your default language.
