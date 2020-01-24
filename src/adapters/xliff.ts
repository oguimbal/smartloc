import fs from 'fs-extra';
import path from 'path';
import js2xliff from 'xliff/js2xliff';
import xliff2js from 'xliff/xliff2js';
import { IFormatAdapter, Translation, GroupedTranslation } from '../cli/interfaces';
import { toGroupedTranslation, ungroupTranslation } from '../cli/utils';
import { AdapterBase } from './adapter-base';

export class XliffAdapter extends AdapterBase {

    protected async doLoadFile(content: string): Promise<Translation> {
        const parsed = await new Promise<GroupedTranslation>((res, rej) => xliff2js(content, (err, val) => err ? rej(err) : res(val)));
        return ungroupTranslation(parsed);
    }

    protected async contentFor(translation: Translation) {
        const data = toGroupedTranslation(translation);
        return await new Promise<string>((res, rej) => js2xliff(data, async (err, result) => {
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