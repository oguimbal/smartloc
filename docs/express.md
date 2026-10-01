# Express

```ts
import express from 'express';
import { loc, setDefaultLocale } from 'smartloc';
import smartloc from 'smartloc/express';
import { loadAllLocales } from 'smartloc/node';

setDefaultLocale('en');
const ready = loadAllLocales('./i18n');

const app = express();
app.use(smartloc({ waitFor: ready }));

app.get('/', (req, res) => res.json({ answer: loc('hello')`Hello world` }));
app.get('/:name', (req, res) => res.send(loc('hi')`Hi ${req.params.name}`));
```

The middleware wraps `res.json()`, `res.jsonp()` and `res.send()` so that everything they serialize is translated for the request's `Accept-Language` header. Requests without that header get the default language.

## Options

```ts
smartloc({
    // Promise to await before translating (e.g. locale loading)
    waitFor: ready,

    // Pick the locale yourself; falls back to Accept-Language when it returns nothing
    customLocaleResolver: req => req.user?.language,   // string, string[], or a Promise of those

    // Called when the resolver throws; the request is then served untranslated
    errorLogger: err => console.error(err),
});
```

Full runnable example: [samples/express/main.ts](../samples/express/main.ts).
