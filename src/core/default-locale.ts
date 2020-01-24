import { ILocaleDef, LocLiteral, ILiteralLocalizer } from './interfaces';
import { LiteralLocalizer } from './literal';
import { getLocaleCode } from '../cli/utils';

export class DefaultLocale implements ILocaleDef {

    readonly literals: ILiteralLocalizer;
    readonly code: string;

    constructor(readonly id: string) {
        this.literals = new LiteralLocalizer(this);
        this.code = getLocaleCode(id);
    }

    localize(id: string, parts: TemplateStringsArray, placeholders: LocLiteral[]): string {

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