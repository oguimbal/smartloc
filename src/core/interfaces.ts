export interface LocStr {
    readonly id: string | undefined;
    /**
     * Localizes this string. To be used within a @see withLocales scope to have an actual translation.
     */
    toString(locale?: string | ILocaleDef): string;
    toJSON(): any;

    /** Apply a transformation to the final translated text */
    transform(transformer: (x: string) => string): LocStr;
}

export type LocLiteral = string | number | Date | LocStr;
export interface ILiteralLocalizer {
    localize(data: LocLiteral): string;
}

export interface ILocaleDef {
    readonly id: string;
    readonly code: string | undefined;
    readonly literals: ILiteralLocalizer;
    localize(id: string, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null): string;
}


export type TranslationOf<T> = T extends LocStr ? string
    : T extends Object ? { [K in keyof T]: TranslationOf<T[K]> }
    : T extends (infer E)[] ? TranslationOf<E>[]
    : T;


export type StorableOf<T> = T extends LocStr ? Stored
    : T extends Object ? { [K in keyof T]: StorableOf<T[K]> }
    : T extends (infer E)[] ? StorableOf<E>[]
    : T;

type Stored = string | { [key: string]: string } | { i18n: string; data: any[] } | LocStr; // LocStr is there in case nonDescriptive is 'skip'