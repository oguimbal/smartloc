import { addLocale } from './locale-list';
import type { TranslationTarget } from './interfaces';

/**
 * Loads a locale generated from CLI
 * @param filePath The file path to load
 * @param merge If true, then the translations will be merged with already existing translations.
 */
export function loadJsonLocale(obj: GroupedTranslation, merge?: boolean): void
export function loadJsonLocale(url: string, merge?: boolean): Promise<void>
export function loadJsonLocale(urlOrObj: string | GroupedTranslation, merge?: boolean) {
    if (typeof urlOrObj === 'string') {
        return fetch(urlOrObj).then(async response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch ${urlOrObj}: ${response.statusText}`);
            }
            const text = await response.json();
            if (typeof text !== 'object') {
                throw new Error(`Expecting ${urlOrObj} to be a JSON object`);
            }
            return loadJsonLocale(text, merge);
        });
    }

    const transformed = convertLocale(ungroupTranslation(urlOrObj));
    addLocale(urlOrObj.targetLanguage, transformed, merge);
}


export interface CollectItem {
    source?: TranslationTarget;
    target?: TranslationTarget | null;
    dirty?: boolean;
}

export interface CollectResult {
    [id: string]: CollectItem;
}

export interface Translation {
    resources: CollectResult;
    sourceLanguage?: string;
    targetLanguage: string;
}


export interface GroupedTranslation {
    resources: { [namespace: string]: CollectResult };
    sourceLanguage?: string;
    targetLanguage: string;
}


export function ungroupTranslation(translation: GroupedTranslation): Translation {
    const result: Translation = {
        targetLanguage: translation.targetLanguage,
        sourceLanguage: translation.sourceLanguage,
        resources: {},
    };
    for (const [namespace, data] of Object.entries(translation.resources)) {
        for (const [id, val] of Object.entries(data ?? {})) {
            if (namespace === '$default') {
                result.resources[id] = val;
            } else {
                result.resources[`${namespace}.${id}`] = val;
            }
        }
    }
    return result;
}



export function convertLocale(locale: Translation): { [key: string]: TranslationTarget } {
    const ret: { [key: string]: TranslationTarget } = {};
    for (const [k, v] of Object.entries(locale.resources)) {
        if (v.target) {
            ret[k] = v.target;
        }
    }
    return ret;
}
