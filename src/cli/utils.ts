import fastDeepEqual from 'fast-deep-equal';
import type { CollectResult, GroupedTranslation, Translation } from '../core/load';

export function groupByNamespace(trans: CollectResult): {[namespace: string]: CollectResult} {
    const result: {[namespace: string]: CollectResult} = {};
    for (let [id, v] of Object.entries(trans)) {
        let namespace = '$default';
        const i = id.indexOf('.');
        if (i > 0 && i < id.length - 2) {
            namespace = id.substr(0, i);
            id = id.substr(i + 1);
        }
        if (!result[namespace]) {
            result[namespace] = {};
        }
        result[namespace][id] = v;
    }
    return result;
}

export function toGroupedTranslation(translation: Translation): GroupedTranslation {
    return {
        resources: groupByNamespace(translation.resources),
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
    };
}


export function deepEqual<T>(obj1: T, obj2: T): boolean {
    // if (typeof Bun !== 'undefined') {
    //     const inst = Bun;
    //     return inst.deepEquals(obj1, obj2);
    // }
    return fastDeepEqual(obj1, obj2);
}