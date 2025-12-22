import path from 'path';
import fs from 'fs-extra';
import { loadLocaleFrom } from '../adapters';
import { addLocale } from '../core/locale-list';
import { convertLocale } from 'src/core/load';

/**
 * Loads all locales generated from CLI
 * @param dirPath The file directory where to look for translation
 * @param merge If true, then the translations will be merged with already existing translations.
 */
export async function loadAllLocales(dirPath: string, merge?: boolean) {
    for (const f of await fs.readdir(dirPath)) {
        await loadLocale(path.join(dirPath, f), merge);
    }
}


/**
 * Loads a locale generated from CLI
 * @param filePath The file path to load
 * @param merge If true, then the translations will be merged with already existing translations.
 */
export async function loadLocale(filePath: string, merge?: boolean) {
    const locale = await loadLocaleFrom(filePath);
    if (!locale) {
        return false;
    }
    const transformed = convertLocale(locale);
    addLocale(locale.targetLanguage, transformed, merge);
    return true;
}
