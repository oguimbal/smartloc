import { afterEach, beforeEach, expect, test } from 'bun:test';
import { addLocale, clearLocales, isLocStr, loc, setDefaultLocale, singleLoc, toJsonStorable, toLocalizable, withLocales, withSerializationContext } from '../src';

beforeEach(() => {
    clearLocales();
    setDefaultLocale('en');
    addLocale('en', {
        name: 'World', greeting: 'Hello {0}',
        count: { singular: 'One item', plural: '{0} items' },
        countOnly: { singular: 'One item', plural: 'Several items' },
    });
    addLocale('fr', {
        name: 'Monde', greeting: 'Bonjour {0}',
        count: { singular: 'Un article', plural: '{0} articles' },
        countOnly: { singular: 'Un article', plural: 'Plusieurs articles' },
    });
});
afterEach(() => clearLocales());

const jsonRoundTrip = (value: unknown) => toLocalizable(JSON.parse(JSON.stringify(toJsonStorable(value))));

test('preserves ordinary strings and revives messages in deeply nested objects and mixed arrays', () => {
    const source = { a: { b: ['Plain text', loc('name')`World`, '', singleLoc('Acme')] } };
    const stored = toJsonStorable(source);
    expect(stored).toEqual({ a: { b: ['Plain text', 'i18n/id:name', '', 'i18n/single:Acme'] } });
    expect(isLocStr(source.a.b[1])).toBe(true);
    const revived = jsonRoundTrip(source);
    expect(revived.a.b[0]).toBe('Plain text');
    expect(revived.a.b[1].toString('fr')).toBe('Monde');
    expect(revived.a.b[2]).toBe('');
    expect(revived.a.b[3].toString('fr')).toBe('Acme');
});

test.each([0, 1, 3])('restores plural count %s before and after JSON serialization', count => {
    const message = loc.plural(count)('count')`${count} items`;
    const stored = toJsonStorable(message);
    for (const revived of [toLocalizable(stored), jsonRoundTrip(message)]) {
        expect(isLocStr(revived)).toBe(true);
        expect(revived.toString('fr')).toBe(count === 1 ? 'Un article' : `${count} articles`);
    }
});

test('restores a plural message whose template has no interpolation', () => {
    const message = loc.plural(3)('countOnly')`Several items`;
    expect(jsonRoundTrip(message).toString('fr')).toBe('Plusieurs articles');
});

test('fully converts messages used as interpolation data before the serialization scope ends', () => {
    const name = loc('name')`World`;
    const message = loc('greeting')`Hello ${name}`;
    const stored = toJsonStorable(message);
    expect(isLocStr((stored as any).data[0])).toBe(false);
    expect((stored as any).data).toEqual(['i18n/id:name']);
    expect(withLocales(['fr'], () => JSON.stringify(stored))).toBe(JSON.stringify(stored));
    expect(jsonRoundTrip(message).toString('fr')).toBe('Bonjour Monde');
    expect(isLocStr(name)).toBe(true);
});

test('recursively revives the interpolation data of native stored messages', () => {
    const name = loc('name')`World`;
    const message = loc('greeting')`Hello ${name}`;
    const stored = withSerializationContext(() => JSON.stringify(message));
    const revived = toLocalizable(JSON.parse(stored));
    expect(revived.toString('fr')).toBe('Bonjour Monde');
});

test('restores parameterized messages directly without a JSON stringify/parse step', () => {
    const message = loc('greeting')`Hello ${'Alice'}`;
    expect(toLocalizable(toJsonStorable(message)).toString('fr')).toBe('Bonjour Alice');
});

test('leaves an already revived message intact', () => {
    const message = jsonRoundTrip(loc('name')`World`);
    expect(toLocalizable(message)).toBe(message);
});
