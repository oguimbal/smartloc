import { ILocaleDef, ILiteralLocalizer, LocLiteral } from './interfaces';
import { LiteralLocalizer } from './literal';
import { getLocaleCode } from '../cli/utils';

export class Locale implements ILocaleDef {
    readonly literals: ILiteralLocalizer;
    readonly code: string;

    constructor(readonly id: string, public localeDef: { [id: string]: string }) {
        this.literals = new LiteralLocalizer(this);
        this.code = getLocaleCode(id);
    }

    localize(id: string, parts: TemplateStringsArray, placeholders: LocLiteral[]): string {
        const template = this.localeDef[id];
        if (!template) {
            return null;
        }
        const literals = placeholders.map(x => this.literals.localize(x));
        return format(template, literals);
    }
}

function format(str: string, args: string[]) {
    return str.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] !== 'undefined'
            ? args[number]
            : match
            ;
    });
};