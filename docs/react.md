# React

Every `LocStr` is also a valid React element. Render it directly:

```tsx
import { loc, setDefaultLocale, changeLocale, loadJsonLocale } from 'smartloc';

setDefaultLocale('en');
await loadJsonLocale('/i18n/fr.json');

function Welcome({ user }) {
    return <h1>{loc('welcome')`Welcome ${<b>{user.name}</b>}`}</h1>;
}
```

- Placeholders can be React nodes. They are kept as nodes when rendered, so the translation `Bienvenue {0} !` yields `Bienvenue <b>Alice</b> !`.
- `changeLocale('fr')` re-renders every mounted `loc` string. No provider or context needed.
- Numbers and dates in placeholders are formatted for the active locale.

## Strings where an element is not allowed

Attributes such as `placeholder`, `title` or `aria-label` need a plain string. Use the hook, which re-renders on locale change:

```tsx
import { useAsString } from 'smartloc';

function Search() {
    const hint = useAsString(loc('search.hint')`Type to search`);
    return <input placeholder={hint} />;
}
```

`useAsString` accepts a `LocStr`, a plain string, `null` or `undefined`. The same hook exists as a method: `loc`...`.useAsString()`.

Outside components, `.toString()` gives the text for the current locale.

## Switching language

```tsx
<select onChange={e => changeLocale(e.target.value)}>
    <option value="en">English</option>
    <option value="fr">Français</option>
</select>
```

The locale must be loaded first (`loadJsonLocale` or `addLocale`), otherwise `changeLocale` throws. Pass `false` as second argument to get `'not found'` instead.

## Notes

- `transform()` results render as their untransformed parent (with a console warning). Apply transformations to the string from `useAsString()` instead.
- `joinArray()` renders its items and separators as a fragment.
- React 19 is a peer dependency. Server-side rendering works with `renderToString`.
