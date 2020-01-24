
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