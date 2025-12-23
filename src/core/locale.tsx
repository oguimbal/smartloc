import { ILocaleDef, ILiteralLocalizer, LocLiteral, TranslationTarget } from './interfaces';
import { LiteralLocalizer } from './literal';
import type React from 'react';
import { asFragment, getLocaleCode } from './utils';

export class Locale implements ILocaleDef {
    readonly literals: ILiteralLocalizer;
    readonly code: string | undefined;

    constructor(readonly id: string, public localeDef: { [id: string]: TranslationTarget }) {
        this.literals = new LiteralLocalizer(this);
        this.code = getLocaleCode(id);
    }

    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react?: false): string | null;
    localize(id: string, count: number | null, parts: TemplateStringsArray | null, placeholders: LocLiteral[] | null, react: true): React.ReactNode | null;
    localize(id: string, count: number | null, _parts: TemplateStringsArray, placeholders: LocLiteral[], react?: boolean): string | React.ReactNode | null {
        const templateObj = this.localeDef[id];
        if (!templateObj) {
            return null;
        }
        let template: string | undefined = undefined;
        if (typeof templateObj === 'string') {
            template = templateObj;
        } else {
            if (count === 1 && templateObj.singular) {
                template = templateObj.singular;
            } else {
                template = templateObj.plural;
            }
        }
        if (!react) {
            // same, but faster
            const literals = placeholders?.map(x => this.literals.localize(x, false));
            return format(template, literals);
        }


        const ret: React.ReactNode[] = [];
        // match all {N} in the template and replace them with the corresponding literal
        const matches = template.matchAll(/\{(\d+)\}/g);
        let currentIndex = 0;
        for (const match of matches) {
            const fromLast = template.substring(currentIndex, match.index);
            if (fromLast) {
                ret.push(fromLast);
            }
            const i = parseInt(match[1]);
            const p = placeholders[i];
            if (p) {
                ret.push(this.literals.localize(p, true));
            } else {
                console.warn(`Placeholder {${i}} in template of ${id} for locale ${this.id} does not exist`);
            }
            currentIndex = match.index + match[0].length;
        }
        const fromLast = template.substring(currentIndex);
        if (fromLast) {
            ret.push(fromLast);
        }
        return asFragment(ret);
    }
}

function format(str: string, args: string[]) {
    if (!args || !args.length) {
        return str;
    }
    return str.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] !== 'undefined'
            ? args[number]
            : match
            ;
    });
}
