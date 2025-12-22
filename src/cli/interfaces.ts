import type { Translation } from '../core/load';
export interface IFormatAdapter {
    write(data: Translation): Promise<void>;
    loadLocales(locales: string[]): Promise<Translation[]>;
    loadFile(path: string): Promise<Translation>;
    loadLocale(locale: string): Promise<Translation>;
}
