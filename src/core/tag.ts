import { SmartLoc } from './smartloc';
import { LocLiteral, LocStr } from './interfaces';
import { autoGenerateId } from './utils';

type TagSignature = (literals: TemplateStringsArray, ...placeholders: LocLiteral[]) => LocStr;

export function loc(literals: TemplateStringsArray, ...placeholders: LocLiteral[]): LocStr
export function loc(uniqueStringId: string): TagSignature;
export function loc(idOrLiterals: string | TemplateStringsArray, ...ph: LocLiteral[]): TagSignature | LocStr {
    if (typeof idOrLiterals === 'string') {
        const id = idOrLiterals;
        return (literals: TemplateStringsArray, ...placeholders: LocLiteral[]) => {
            return new SmartLoc(id, literals, placeholders) as LocStr;
        };
    }

    const autoId = idOrLiterals && autoGenerateId(idOrLiterals);
    return new SmartLoc(autoId, idOrLiterals, ph) as LocStr;
}
