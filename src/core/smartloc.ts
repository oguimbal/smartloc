import { getLocale, getDefaultLocale, listLocales } from './locale-list';
import { ILocaleDef, LocLiteral, LocStr } from './interfaces';
import { setIsLoc } from './literal';
import { getLocaleCode } from '../cli/utils';

let langCtx: ILocaleDef[] = null;
let serialContext: SerializationContextOptions;

export interface SerializationContextOptions {
    /** HOw non self-descriptive (MultiLoc, SingleLoc, ...) will be transformed. Defaults to 'id'.
     *
     * id => will serialize its ID ... the context of deserialization will be required to have the given translation
     * skip => will be left as it (=> serialization will translate it)
     * toMulti => translates to all registered languages, and serializes as a 'multi'
     */
    nonSelfDescriptive?: 'skip' | 'toMulti' | 'id';
}
/**
 * Execute something in the given locales context.
 * @param acceptLanguages The accepted languages, by order of preference
 * @param action Action to perform (usually a JSON.serialize() or a .toString() operation)
 **/
export function withLocales<T = void>(acceptLanguages: string[], action: () => T) {
    if (!acceptLanguages || !acceptLanguages.length) {
        return action();
    }
    const oldLangCtx = langCtx;
    try {
        // set accepted languages
        langCtx = acceptLanguages
            .map(getLocale)
            .filter(x => !!x);

        // perform action
        return action();
    } finally {
        langCtx = oldLangCtx;
    }
}

/**
 * Execute something in a context where .toJson() loc strings
 * will be serialized into a form that is parsable via jsonParseLocalized()
 */
export function withSerializationContext<T = void>(action: () => T, options?: SerializationContextOptions) {
    const os = serialContext;
    try {
        serialContext = options || {};
        return action();
    } finally {
        serialContext = os;
    }
}

export class TransformedLoc implements LocStr {

    get id() {
        return this.parent.id;
    }

    constructor(private parent: LocStr, private transformer: (x: string) => string) {
        if (typeof transformer !== 'function') {
            throw new Error('transformer must be a function');
        }
        setIsLoc(this);
    }

    toJSON() {
        if (serialContext) {
            throw new Error('Cannot serialize transformed localized strings');
        }
        return this.toString();
    }


    toString(locale?: string | ILocaleDef) {
        const ret = this.parent.toString(locale);
        return ret && this.transformer(ret);
    }

    transform(transformer: (x: string) => string): LocStr {
        return new TransformedLoc(this, transformer);
    }
}

/**
 * A localizable string instance
 */
export class SmartLoc implements LocStr {
    constructor(public id: string, private literals: TemplateStringsArray, private placeholders: LocLiteral[]) {
        setIsLoc(this);
    }

    toJSON() {
        if (serialContext) {
            switch (serialContext.nonSelfDescriptive) {
                case 'skip':
                    return this;
                case 'toMulti':
                    const multi = {};
                    for (const l of listLocales()) {
                        multi[l] = this.toString(l);
                    }
                    // tslint:disable-next-line: no-use-before-declare
                    return new MultiLoc(multi).toJSON();
                default:
                    if (this.placeholders?.length) {
                        return {
                            i18n: this.id,
                            data: this.placeholders,
                        };
                        // throw new Error(`Cannot serialize smartloc instance "${this.id}" which has placeholders ("\${}" in string definition). Please use another SerializationContextOption.nonSelfDescriptive option`);
                    }
                    return `i18n/id:${this.id}`;
            }
        }
        return this.toString();
    }

    toString(locale?: string | ILocaleDef) {
        if (typeof locale === 'string') {
            locale = getLocale(locale);
        }

        if (locale) {
            const localized = locale.localize(this.id, this.literals, this.placeholders);
            if (localized) {
                return localized;
            }
        }
        if (langCtx?.length) {
            for (const l of langCtx) {
                const localized = l.localize(this.id, this.literals, this.placeholders);
                if (localized) {
                    return localized;
                }
            }
        }
        const defaultLocale = getDefaultLocale();
        if (!defaultLocale) {
            throw new Error('You must specify default locale via setDefaultLocale() before using localization');
        }
        return defaultLocale.localize(this.id, this.literals, this.placeholders);
    }

    transform(transformer: (x: string) => string): LocStr {
        return new TransformedLoc(this, transformer);
    }
}

/** A loc string that has only one translation for all locales */
export class SingleLoc implements LocStr {
    readonly id: string = undefined;

    constructor(public text: string) {
        setIsLoc(this);
    }

    toJSON() {
        if (serialContext) {
            return 'i18n/single:' + this.text;
        }
        return this.text;
    }

    toString() {
        return this.text;
    }

    transform(transformer: (x: string) => string): LocStr {
        return new TransformedLoc(this, transformer);
    }
}

/** A given set of translations */
export class MultiLoc implements LocStr {
    readonly id: string = undefined;

    constructor(public translations: { [locale: string]: string }) {
        setIsLoc(this);
    }

    toJSON() {
        if (serialContext) {
            const ret = {};
            for (const [k, v] of Object.entries(this.translations)) {
                ret[`i18n:${k}`] = v;
            }
            return ret;
        }
        return this.toString();
    }

    toString(locale?: string | ILocaleDef) {
        if (locale) {
            if (typeof locale === 'object') {
                if (this.translations[locale.id]) {
                    return this.translations[locale.id];
                }
                if (this.translations[locale.code]) {
                    return this.translations[locale.code];
                }
            } else if (typeof locale === 'string') {
                for (const l of [locale, getLocaleCode(locale)]) {
                    if (this.translations[l]) {
                        return this.translations[l];
                    }
                }
            }
        }

        if (langCtx?.length) {
            for (const l of langCtx) {
                if (this.translations[l.id]) {
                    return this.translations[l.id];
                }
                if (this.translations[l.code]) {
                    return this.translations[l.code];
                }
            }
        }
        const defaultLocale = getDefaultLocale();
        if (!defaultLocale) {
            throw new Error('You must specify default locale via setDefaultLocale() before using localization');
        }
        if (this.translations[defaultLocale.id]) {
            return this.translations[defaultLocale.id];
        }
        if (this.translations[defaultLocale.code]) {
            return this.translations[defaultLocale.code];
        }
        return null;
    }

    transform(transformer: (x: string) => string): LocStr {
        return new TransformedLoc(this, transformer);
    }
}
