import { ILocaleDef, LocLiteral, ILiteralLocalizer } from './interfaces';
import { LiteralLocalizer } from './literal';
import { getLocale } from './locale-list';
import { asFragment, autoGenerateId, getLocaleCode } from './utils';
import React from 'react';

const emptyStringAutoId = autoGenerateId([]);
export class DefaultLocale implements ILocaleDef {

    readonly literals: ILiteralLocalizer;
    readonly code: string | undefined;

    constructor(readonly id: string) {
        this.literals = new LiteralLocalizer(this);
        this.code = getLocaleCode(id);
    }

    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react: false): string;
    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react: true): React.ReactNode;
    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react: boolean): string | React.ReactNode {
        const existing = getLocale(this.id);
        if (existing) {
            const exist = existing.localize(id, count, parts, placeholders, react);
            if (exist) {
                return exist;
            }
        }

        if (!parts || !placeholders) {
            // special case for empty string, which could not be translated.
            if (id === emptyStringAutoId) {
                return '';
            }
            throw new Error(`The smartloc string "${id}" cannot be translated to your default locale. It is likely that is has been deserialized. In order to support deserialized strings, you MUST load your default locale as a classic locale. nb: To generate your default locale translation file through smartloc CLI, use --generateDefault option`)
        }

        // fallback to the in-code translation
        const result: React.ReactNode[] = [];

        // interleave the literals with the placeholders
        for (let i = 0; i < placeholders.length; i++) {
            result.push(parts[i]);
            result.push(this.literals.localize(placeholders[i], react));
        }

        // add the last literal
        result.push(parts[parts.length - 1]);
        if (react) {
            // return a fragment having result as children
            return asFragment(result);
        }
        return result.join('');
    }
}