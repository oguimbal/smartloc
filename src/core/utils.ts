import { LocStr, ILocaleDef } from './interfaces';
import { TransformedLoc } from './smartloc';
import { setIsLoc } from './literal';
import sha1 from 'js-sha1';


class JoinedString implements LocStr {
    get id(): string {
        return undefined;
    }

    constructor(private strs: (LocStr | string)[], private join: string) {
        setIsLoc(this);
    }

    toString(locale?: string | ILocaleDef): string {
        return this.strs
            .map(x => x && (typeof x === 'string' ? x : x.toString(locale)))
            .join(this.join);
    }

    toJSON() {
        return this.toString();
    }

    transform(transformer: (x: string) => string): LocStr {
        return new TransformedLoc(this, transformer);
    }
}


export class LocStringArray {
    constructor(private strs: (LocStr | string)[]) {
    }

    toJSON() {
        return this.strs.map(x => x && (typeof x === 'string' ? x : x.toJSON()));
    }

    map(fn: (x: LocStr, index: number) => LocStr) {

        return new LocStringArray(this.strs.map(fn));
    }

    slice(start?: number, end?: number) {
        return new LocStringArray(this.strs.slice(start, end));
    }

    join(join: string): LocStr {
        return new JoinedString(this.strs, join);
    }

    toArray() {
        return [...this.strs];
    }
}


export function autoGenerateId(str: TemplateStringsArray | string[]): string {
    const sha = sha1(str.join('|'));
    return 'sha1.' + sha;
}