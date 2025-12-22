import { smartLoc } from './smartloc';
import { LocLiteral, LocStr } from './interfaces';
import { autoGenerateId } from './utils';


type Templater = (literals: TemplateStringsArray, ...placeholders: LocLiteral[]) => LocStr;
// just a signature.
declare function _tagSig(id: string): Templater
declare function _tagSig(literals: TemplateStringsArray, ...placeholders: LocLiteral[]): LocStr;
type TagSignature = typeof _tagSig;
type LocTag = TagSignature & { plural(count: number): TagSignature };




function __loc(count: number | undefined, idOrLiterals: string | TemplateStringsArray, ...ph: LocLiteral[]): Templater | LocStr {
    if (typeof idOrLiterals === 'string') {
        const id = idOrLiterals;
        return (literals: TemplateStringsArray, ...placeholders: LocLiteral[]) => {
            return smartLoc({ id, literals, placeholders, count });
        };
    }
    return smartLoc({ id: autoGenerateId(idOrLiterals), literals: idOrLiterals, placeholders: ph, count });
}

function _loc(id: string): Templater;
function _loc(idOrLiteralsOrCount: string | TemplateStringsArray, ...ph: LocLiteral[]): LocStr;
function _loc(idOrLiteralsOrCount: string | TemplateStringsArray, ...ph: LocLiteral[]): Templater | LocStr {
    return __loc(undefined, idOrLiteralsOrCount, ...ph);
}
_loc.plural = (count: number) => {
    function templater(id: string): Templater;
    function templater(template: TemplateStringsArray, ...placeholders: LocLiteral[]): Templater;
    function templater(idOrLiterals: string | TemplateStringsArray, ...ph: LocLiteral[]): Templater | LocStr {
        return __loc(count, idOrLiterals, ...ph);
    }
    return templater;
};

export const loc: LocTag = _loc as any;
