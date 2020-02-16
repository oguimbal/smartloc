import { MultiLoc, SingleLoc, SmartLoc, withSerializationContext, withLocales, SerializationContextOptions } from './smartloc';
import moment from 'moment';
import { isLocStr } from './literal';
import { TranslationOf, StorableOf } from './interfaces';

/**
 * Parse a JSON string where localized strings have been serialized in their non translated form
 */
export function jsonParseLocalized(value: string) {
    const parsed = JSON.parse(value);
    return _toLocalizable(parsed, 50);
}

/**
 * Transforms an object that has been deserialized from a non translated from to an object that is translatable
 */
export function toLocalizable(value: any) {
    return _toLocalizable(value, 50);
}
function _toLocalizable(value: any, depth: number) {
    if (depth < 0) {
        throw new Error('This object is either too nested, or has cycles');
    }
    if (!value) {
        return value;
    }

    if (typeof value === 'string') {
        if (value.startsWith('i18n/single:')) {
            return new SingleLoc(value.substr('i18n/single:'.length));
        }
        if (value.startsWith('i18n/id:')) {
            return new SmartLoc(value.substr('i18n/id:'.length), null, null);
        }
        return value;
    }

    if (typeof value !== 'object' || value instanceof Date) {
        return value;
    }

    // === handle arrays
    if (value instanceof Array) {
        const retArray = [];
        let arrChange = false;
        for (let i = 0; i < value.length; i++) {
            const thisVal = _toLocalizable(value[i], depth - 1);
            arrChange = arrChange || thisVal !== value[i];
            retArray.push(thisVal);
        }
        return arrChange
            ? retArray
            : value;
    }
    const keys = Object.keys(value);
    if (!keys.length) {
        return value;
    }

    // === handle smartloc with args
    if (keys.length === 2 && keys.includes('i18n') && keys.includes('data') && typeof value.i18n === 'string' && value.data instanceof Array) {
        return new SmartLoc(value.i18n, null, value.data);
    }

    // === handle multi
    const ret = {};
    if (!keys.some(x => !x.startsWith('i18n:'))) {
        for (const k of keys) {
            ret[k.substr('i18n:'.length)] = value[k];
        }
        return new MultiLoc(ret);
    }

    // === handle plain object
    let changed = false;
    for (const k of keys) {
        ret[k] = _toLocalizable(value[k], depth - 1);
        changed = changed || (ret[k] !== value[k]);
    }
    return changed
        ? ret
        : value;
}

/**
 * Transforms an object so it can be stored with localized strings in their non translated form
 * @returns Either a new copy of your object, or your object (if had no smarloc strings in it)
 */
export function toJsonStorable<T>(value: T, options?: SerializationContextOptions): StorableOf<T> {
    return withSerializationContext(() => _toJsonStorable(value, 50), options);
}

/** Translates an object to the given language */
export function translateObject<T>(locales: string | string[], object: T): TranslationOf<T> {
    if (typeof locales === 'string') {
        locales = [locales];
    }
    return withLocales(locales, () => _toJsonStorable(object, 50));
}

/** Translates an object according to the current context (call this when wrapped in withSerializationContext() or withLocales()) */
export function translateInContext(object: any) {
    return _toJsonStorable(object, 50);
}

function _toJsonStorable(v: any, depth: number) {
    if (depth < 0) {
        throw new Error('This object is either too nested, or has cycles');
    }
    if (!v) {
        return v;
    }
    if (typeof v !== 'object') {
        return v;
    }
    if (moment.isMoment(v) || moment.isDuration(v)) {
        return v;
    }
    if (v instanceof Array) {
        let ret: any[];
        for (let i = 0; i < v.length; i++) {
            const p = _toJsonStorable(v[i], depth - 1);
            if (p !== v[i] && !ret) {
                ret = Array(v.length);
                for (let j = 0; j < i; j++) {
                    ret[j] = v[j];
                }
            }
            if (ret) {
                ret[i] = p;
            }
        }
        return ret || v;
    }
    if (isLocStr(v)) {
        return v.toJSON();
    }

    const obj = {};
    let diff = false;
    for (const [k, p] of Object.entries(v)) {
        const val = _toJsonStorable(p, depth - 1);
        if (val !== p) {
            diff = true;
        }
        obj[k] = val;
    }
    if (!diff) {
        return v;
    }
    Object.setPrototypeOf(obj, Object.getPrototypeOf(v));
    return obj;
}
