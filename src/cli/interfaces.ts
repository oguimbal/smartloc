export interface IFormatAdapter {
    write(data: Translation): Promise<void>;
    loadLocales(locales: string[]): Promise<Translation[]>;
    loadFile(path: string): Promise<Translation>;
}

export interface CollectItem {
    source?: string;
    target?: string;
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
    resources: {[namespace: string]: CollectResult};
    sourceLanguage?: string;
    targetLanguage: string;
}