import type { IFormatAdapter } from '../cli/interfaces';
import { XliffAdapter } from './xliff';
import { JsonAdapter } from './json';
import type { Translation } from '../core/load';

export function getAdapter(format: string, dir: string): IFormatAdapter {
    switch (format) {
        case 'xliff':
            return new XliffAdapter(dir);
        case 'json':
            return new JsonAdapter(dir);
        default:
            throw new Error('Unknown translation format: ' + format);
    }
}

export async function loadLocaleFrom(path: string): Promise<Translation | null> {
    const [ext] = /\.[a-z]+$/.exec(path.toLowerCase()) || [null];
    let adapter: IFormatAdapter;
    switch (ext) {
        case '.json':
            adapter = new JsonAdapter(null);
            break;
        case '.xlf':
            adapter = new XliffAdapter(null);
            break;
        default:
            return null;
    }
    return await adapter.loadFile(path);
}