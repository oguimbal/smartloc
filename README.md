# smartloc

Internationalization with tagged template strings, for Node APIs and React apps.

```ts
const msg = loc('greeting')`Hello ${name}!`;
```

`msg` is not translated yet. It gets translated at the very last moment: when Express sends the response, when GraphQL resolves the field, or when React renders it.

## Why smartloc?

- **Your code stays readable.** The source text lives in the code, not in a `keys.json` you have to look up.
- **No language to pass around.** Build your objects as usual. Translation happens at the boundary, based on `Accept-Language` or the current UI locale.
- **Server and browser.** Same strings, same API, in Express, Apollo/GraphQL and React.
- **A CLI does the bookkeeping.** It collects strings from your code and keeps your JSON/XLIFF translation files in sync.

## Install

```bash
npm install smartloc
```

## Quick start

```ts
import { loc, setDefaultLocale, addLocale, withLocales } from 'smartloc';

setDefaultLocale('en');
addLocale('fr', { greeting: 'Bonjour {0} !' });

const msg = loc('greeting')`Hello ${'world'}!`;

msg.toString();                                       // Hello world!
withLocales(['fr'], () => msg.toString());            // Bonjour world !
withLocales(['fr'], () => JSON.stringify({ msg }));   // {"msg":"Bonjour world !"}
```

The ID is optional: ``loc`Hello` `` gets an ID derived from its text. Numbers and dates in placeholders are formatted for the target locale.

## Use it with

### Express

```ts
import smartloc from 'smartloc/express';

app.use(smartloc());
app.get('/', (req, res) => res.json({ answer: loc`Hello` }));
```

`res.json()` and `res.send()` are translated according to the request's `Accept-Language` header. See [docs/express.md](docs/express.md).

### GraphQL (Apollo)

```ts
import { GLocString, localizeSchema, localizedContext } from 'smartloc/graphql';
```

Declare fields as `LocalizedString`, wrap your schema and context, and resolvers can return `loc` strings. See [docs/graphql.md](docs/graphql.md).

### React

A `loc` string is also a React element. Placeholders can be React nodes.

```tsx
<h1>{loc('welcome')`Welcome ${<b>{user.name}</b>}`}</h1>
```

`changeLocale('fr')` re-renders every rendered string. Use `useAsString()` where a plain string is needed. See [docs/react.md](docs/react.md).

## Translate your app

```bash
npx smartloc collect --format=json --locales=fr,de --defaultLocale=en
```

This scans your sources and writes one file per locale in `./i18n`. Translate the `target` values, then load them at startup:

```ts
import { loadAllLocales } from 'smartloc/node';   // server
await loadAllLocales('./i18n');

import { loadJsonLocale } from 'smartloc';        // browser
await loadJsonLocale('/i18n/fr.json');
```

Re-run `collect` whenever your code changes. It keeps existing translations and flags the ones whose source text changed. See [docs/cli.md](docs/cli.md).

## Going further

- [docs/api.md](docs/api.md): plurals, locale resolution, `multiLoc`, `singleLoc`, `joinArray`, `transform`
- [docs/storage.md](docs/storage.md): storing untranslated strings in a database
- [Tutorial on dev.to](https://dev.to/oguimbal/i18n-express-apollo-graphql-server-translation-made-simple-33f5)
- [AGENTS.md](AGENTS.md): instructions for AI coding agents using this library

## License

MIT
