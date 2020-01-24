
import moment from 'moment';

export interface LocStr {
    readonly id: string;
    /**
     * Localizes this string. To be used within a @see withLocales scope to have an actual translation.
     */
    toString(locale?: string | ILocaleDef): string;
    toJSON(): any;

    /** Apply a transformation to the final translated text */
    transform(transformer: (x: string) => string): LocStr;
}

export type LocLiteral = string | number | Date | moment.Moment | moment.Duration | LocStr;
export interface ILiteralLocalizer {
    localize(data: LocLiteral): string;
}

export interface ILocaleDef {
    readonly id: string;
    readonly code: string;
    readonly literals: ILiteralLocalizer;
    localize(id: string, parts: TemplateStringsArray, placeholders: LocLiteral[]): string;
}


export type TranslationOf<T> = T extends LocStr ? string
    : T extends Object ? {[K in keyof T]: TranslationOf<T[K]>}
    : T extends (infer E)[] ?  TranslationOf<E>[]
    : T;


export type StorableOf<T> = T extends LocStr ? (string | {[key: string]: string})
    : T extends Object ? {[K in keyof T]: StorableOf<T[K]>}
    : T extends (infer E)[] ?  StorableOf<E>[]
    : T;
