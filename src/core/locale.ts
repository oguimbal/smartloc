import { ILocaleDef, ILiteralLocalizer, LocLiteral } from './interfaces';
import { LiteralLocalizer } from './literal';
import { getLocaleCode } from '../cli/utils';

export class Locale implements ILocaleDef {
    readonly literals: ILiteralLocalizer;
    readonly code: string | undefined;

    constructor(readonly id: string, public localeDef: { [id: string]: string }) {
        this.literals = new LiteralLocalizer(this);
        this.code = getLocaleCode(id);
    }

    localize(id: string, _parts: TemplateStringsArray, placeholders: LocLiteral[]): string {
        const template = this.localeDef[id];
        if (!template) {
            // mmh... wat to do?
            return '';
        }
        const literals = placeholders?.map(x => this.literals.localize(x));
        return format(template, literals);
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
};