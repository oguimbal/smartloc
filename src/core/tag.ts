import { smartLoc } from './smartloc';
import { LocLiteral, LocStr } from './interfaces';
import { autoGenerateId } from './utils';


type Templater = (literals: TemplateStringsArray, ...placeholders: LocLiteral[]) => LocStr;
// just a signature.
declare function _tagSig(id: string): Templater
declare function _tagSig(literals: TemplateStringsArray, ...placeholders: LocLiteral[]): LocStr;
type TagSignature = typeof _tagSig;
type LocTag = TagSignature & {
    /** Creates a pluralizable string (will have two versions to be translated based on the given count: singlular & plural) */
    plural(count: number): TagSignature;
    /** Does nothing, except that the translation will not be collected (use for formatting purposes) */
    nocollect: LocTag
};




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
_loc.nocollect = () => {
    return _loc;
};

export const loc: LocTag = _loc as any;
