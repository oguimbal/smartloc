import { Translation, CollectResult, GroupedTranslation } from './interfaces';

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

export function ungroupTranslation(translation: GroupedTranslation): Translation {
    const result: Translation = {
        targetLanguage: translation.targetLanguage,
        sourceLanguage: translation.sourceLanguage,
        resources: {},
    };
    for (const [namespace, data] of Object.entries(translation.resources)) {
        for (const [id, val] of Object.entries(data)) {
            if (namespace === '$default') {
                result.resources[id] = val;
            } else {
                result.resources[`${namespace}.${id}`] = val;
            }
        }
    }
    return result;
}

export function getLocaleCode(locale: string) {
    return locale && /^[a-z]+/.exec(locale.toLowerCase())?.[0] || undefined;
}