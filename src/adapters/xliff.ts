// @ts-ignore
import js2xliff from 'xliff/js2xliff';
// @ts-ignore
import xliff2js from 'xliff/xliff2js';
import type { Translation, GroupedTranslation } from '../core/load';
import { toGroupedTranslation } from '../cli/utils';
import { ungroupTranslation } from '../core/load';
import { AdapterBase } from './adapter-base';

export class XliffAdapter extends AdapterBase {

    protected async doLoadFile(content: string): Promise<Translation> {
        const parsed = await new Promise<GroupedTranslation>((res, rej) => xliff2js(content, (err: any, val: any) => err ? rej(err) : res(val)));
        return ungroupTranslation(parsed);
    }

    protected async contentFor(translation: Translation) {
        const data = toGroupedTranslation(translation);
        return await new Promise<string>((res, rej) => js2xliff(data, async (err: any, result: any) => {
            if (err) {
                return rej(err);
            }
            try {
                res(result);
            } catch (e) {
                rej(e);
            }
        }));
    }
}
