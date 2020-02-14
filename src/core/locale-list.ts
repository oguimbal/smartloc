import { ILocaleDef } from './interfaces';
import { DefaultLocale } from './default-locale';
import { Locale } from './locale';

let locales: {[key: string]: Locale} = {};

let defaultLocale: ILocaleDef;

/** Defines the locale used in code */
export function setDefaultLocale(localeId: string) {
    defaultLocale = new DefaultLocale(localeId);
}

export function getDefaultLocale() {
    return defaultLocale;
}

/** Resets all locales */
export function clearLocales() {
    locales = {};
}

/** Remove a locale */
export function removeLocale(id: string) {
    id = id.toLowerCase();
    const existing = locales[id];
    if (!existing) {
        return;
    }
    delete locales[id];
    const bl = baseLocale(id);
    if (bl && locales[bl] === existing) {
        delete locales[bl];
    }
}

/**
 * Adds translations
 * @param id Locale ID (ex: 'en', or 'en-US')
 * @param localeDef Translations (string id as key, formatted string as values - ex : {myId: 'Translated {0} text {1}'})
 * @param merge If true, then the translations will be merged with already existing translations.
 */
export function addLocale(id: string, localeDef: {[id: string]: string}, merge?: boolean) {
    id = id.toLowerCase();
    let loc  = locales[id];
    if (loc) {
        if (!merge) {
            throw new Error(`There already is a locale '${id}' defined. Set the 'merge' argument to 'true' if you want to add translations`);
        }
        loc.localeDef = {
            ...loc.localeDef,
            ...localeDef,
        };
        return;
    }
    loc = locales[id] = new Locale(id, localeDef);
    const bl = baseLocale(id);
    if (bl && !locales[bl]) {
        locales[bl] = loc;
    }
}

export function getLocale(id: string): ILocaleDef {
    if (!id) {
        return null;
    }
    const found = locales[id];
    if (found) {
        return found;
    }
    // if given "en-US", then try to downgrade to a non specific language.
    const bl = baseLocale(id);
    return bl && locales[bl] || null;
}

function baseLocale(l: string) {
    const m = /^([a-zA-Z]+)\-[a-zA-Z]+$/.exec(l);
    return m?.[1] || null;
}

export function *listLocales() {
    yield* Object.keys(locales);
    yield defaultLocale.id;
}