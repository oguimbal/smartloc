import fs from 'fs-extra';
import path from 'path';
import { IFormatAdapter, Translation, GroupedTranslation } from '../cli/interfaces';
import stableJson from 'json-stable-stringify';
import { toGroupedTranslation, ungroupTranslation } from '../cli/utils';
import { parse } from 'querystring';
import { AdapterBase } from './adapter-base';

export class JsonAdapter extends AdapterBase {

    protected async doLoadFile(content: string): Promise<Translation> {
        const parsed = JSON.parse(content) as GroupedTranslation;
        return ungroupTranslation(parsed);
    }

    protected async contentFor(translation: Translation) {
        const data = toGroupedTranslation(translation);
        const content = stableJson(data, { space: '    ' });
        return content;
    }
}