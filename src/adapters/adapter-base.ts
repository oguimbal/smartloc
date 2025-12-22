import { IFormatAdapter } from '../cli/interfaces';
import fs from 'fs-extra';
import path from 'path';
import type { Translation } from '../core/load';

export abstract class AdapterBase implements IFormatAdapter {

    constructor(private target: string | null) {
    }

    async loadFile(filePath: string): Promise<Translation> {
        if (!await fs.pathExists(filePath)) {
            throw new Error(`File ${filePath} does not exist`);
        }
        const content = await fs.readFile(filePath, 'utf8');
        return await this.doLoadFile(content);
    }

    async loadLocale(locale: string): Promise<Translation> {
        if (!this.target || !await fs.pathExists(this.target)) {
            return {
                resources: {},
                targetLanguage: locale,
            };
        }
        return await this.loadFile(path.join(this.target, `${locale}.json`));
    }

    protected abstract doLoadFile(content: string): Promise<Translation>;

    async loadLocales(locales: string[]): Promise<Translation[]> {
        if (!this.target || !await fs.pathExists(this.target)) {
            return locales.map<Translation>(x => ({
                resources: {},
                targetLanguage: x,
            }));
        }
        const ret: Translation[] = [];
        for (const f of locales) {
            const t = await this.loadFile(path.join(this.target, `${f}.json`));
            t.targetLanguage = f;
            ret.push(t);
        }
        return ret;
    }

    async write(translation: Translation) {
        if (!this.target) {
            throw new Error('Target directory not set');
        }
        await fs.ensureDir(this.target);
        const content = await this.contentFor(translation);
        const toFile = path.join(this.target, translation.targetLanguage + '.json');
        await fs.writeFile(toFile, content, 'utf8');
    }

    protected abstract contentFor(translation: Translation): Promise<string>;
}