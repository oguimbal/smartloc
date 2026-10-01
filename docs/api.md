# Core API

Everything below is exported from `smartloc`.

## Declaring strings

```ts
import { loc } from 'smartloc';

loc('user.greeting')`Hello ${name}`;   // explicit ID (recommended)
loc`Hello ${name}`;                    // auto ID: sha1 of the source text
```

- **Explicit IDs** survive text changes. Use a `.` to namespace them (`user.greeting`): the CLI groups translation files by the part before the first dot.
- **Auto IDs** change whenever the source text changes, so the translation is lost. Fine for throwaway strings.
- Placeholders can be strings, numbers, `Date`, other `loc` strings, or React nodes.
  - Numbers are formatted with `Intl.NumberFormat` for the target locale.
  - Dates are formatted with `Intl.DateTimeFormat` (day + month + year, plus time when the date has one).
  - Nested `loc` strings are translated in the same locale.
- In translation files, placeholders appear as `{0}`, `{1}`, ... in source order.

### Plurals

```ts
loc.plural(count)('cart.items')`${count} items`;
```

`count === 1` selects the `singular` form, anything else the `plural` form:

```ts
addLocale('fr', {
    'cart.items': { singular: 'Un article', plural: '{0} articles' },
});
```

The code only contains the plural form. The singular form of your default language lives in the default-locale translation file. Generate it with `--defaultLocale` and load it like any other locale.

### `loc.nocollect`

Same as `loc`, but the CLI ignores it. Useful for formatting helpers.

## Locales

```ts
import { setDefaultLocale, addLocale, changeLocale, removeLocale, clearLocales } from 'smartloc';

setDefaultLocale('en');                     // the language you write code in (required)
addLocale('fr-FR', { id: 'Texte {0}' });    // register translations
addLocale('fr-FR', { other: '...' }, true); // merge into an existing locale
changeLocale('fr-FR');                      // switch the current locale (UI apps)
removeLocale('fr-FR');
clearLocales();
```

Locale IDs are case-insensitive. `fr-FR` also registers `fr` when no `fr` exists, so a request for `fr-CA` falls back to it.

Prefer the CLI-generated files over hand-written `addLocale` calls: see [cli.md](cli.md).

## Getting a translation

```ts
const s = loc('id')`Hello`;

s.toString();                       // resolved from context (see below)
s.toString('fr');                   // force a locale
withLocales(['fr-CA', 'fr'], () => s.toString());   // Accept-Language style list
JSON.stringify({ s });              // toJSON() translates like toString()
```

Resolution order for `toString()`:

1. The locale passed as argument.
2. The `withLocales()` list, first locale that has the string.
3. The current locale set with `changeLocale()`.
4. The default locale (in-code text).

`withLocales` is what the Express and GraphQL integrations call for you.

### Translating whole objects

```ts
import { translateObject, translateInContext } from 'smartloc';

translateObject('fr', { title: loc`Hello`, items: [loc`A`] });   // { title: 'Bonjour', items: ['A'] }
withLocales(['fr'], () => translateInContext(obj));               // same, using ambient context
```

Both return a copy only when something changed. Typed as `TranslationOf<T>`.

## Other kinds of strings

All of them implement the same `LocStr` interface as `loc`.

```ts
import { singleLoc, multiLoc, joinArray } from 'smartloc';

singleLoc('TypeScript');                        // same text in every language
multiLoc({ en: 'Hello', fr: 'Bonjour' });        // translations declared inline
joinArray(', ', [loc`Red`, loc`Blue`]);          // translated join; separator may be a LocStr too
loc`<b>Hi</b>`.transform(escapeHtml);            // post-process the translated text
```

`transform()` results cannot be stored (see [storage.md](storage.md)) and render as their parent in React.

## Utilities

- `isLocStr(value)`: type guard for any `LocStr`.
- `getDefaultLocale()`: the locale set with `setDefaultLocale`.

## Cloning objects that contain `LocStr`

`LocStr` instances are frozen objects tagged with a symbol. A deep clone must copy the prototype and symbol properties, or simply skip values where `isLocStr(v)` is true (they are immutable). `JSON.parse(JSON.stringify(obj))` turns them into plain, default-language strings.
