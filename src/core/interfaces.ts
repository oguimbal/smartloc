import type React from 'react';

export type LocStr = InternalLocStr & React.ReactElement;

export interface InternalLocStr {
    /**
     * Localizes this string. To be used within a @see withLocales scope to have an actual translation.
     */
    toString(locale?: string | ILocaleDef): string;
    toJSON(): any;

    /** Apply a transformation to the final translated text */
    transform(transformer: (x: string) => string): LocStr;

    /** React hook equivalent of .toString(), but which will updated when local changes */
    useAsString(): string;
}

export type LocLiteral = string | number | Date | LocStr | React.ReactNode;
export interface ILiteralLocalizer {
    localize(data: LocLiteral, react: false): string;
    localize(data: LocLiteral, react: true): React.ReactNode;
    localize(data: LocLiteral, react: boolean): string | React.ReactNode;
}

export interface ILocaleDef {
    readonly id: string;
    readonly code: string | undefined;
    readonly literals: ILiteralLocalizer;
    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react: false): string | null;
    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react: true): React.ReactNode | null;
    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react: boolean): string | React.ReactNode | null;
}

export type TranslationTarget = string | {
    singular: string | null;
    plural: string;
}

export type TranslationOf<T> = T extends LocStr ? string
    : T extends Object ? { [K in keyof T]: TranslationOf<T[K]> }
    : T extends (infer E)[] ? TranslationOf<E>[]
    : T;


export type StorableOf<T> = T extends LocStr ? Stored
    : T extends Object ? { [K in keyof T]: StorableOf<T[K]> }
    : T extends (infer E)[] ? StorableOf<E>[]
    : T;

type Stored = string | { [key: string]: string } | { i18n: string; data: any[]; count?: number } | LocStr; // LocStr is there in case nonDescriptive is 'skip'