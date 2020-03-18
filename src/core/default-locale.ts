import { ILocaleDef, LocLiteral, ILiteralLocalizer } from './interfaces';
import { LiteralLocalizer } from './literal';
import { getLocaleCode } from '../cli/utils';
import { getLocale } from './locale-list';

export class DefaultLocale implements ILocaleDef {

    readonly literals: ILiteralLocalizer;
    readonly code: string;

    constructor(readonly id: string) {
        this.literals = new LiteralLocalizer(this);
        this.code = getLocaleCode(id);
    }

    localize(id: string, parts: TemplateStringsArray, placeholders: LocLiteral[]): string {
        const existing = getLocale(this.id);
        if (existing) {
            const exist = existing.localize(id, parts, placeholders);
            if (exist) {
                return exist;
            }
        }

        if (!parts || !placeholders) {
            throw new Error(`The smartloc string "${id}" cannot be translated to your default locale. It is likely that is has been deserialized. In order to support deserialized strings, you MUST load your default locale as a classic locale. nb: To generate your default locale translation file through smartloc CLI, use --generateDefault option`)
        }
        const result: string[] = [];

        // interleave the literals with the placeholders
        for (let i = 0; i < placeholders.length; i++) {
            result.push(parts[i]);
            result.push(this.literals.localize(placeholders[i]));
        }

        // add the last literal
        result.push(parts[parts.length - 1]);
        return result.join('');
    }
}