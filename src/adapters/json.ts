import { type Translation, type GroupedTranslation, ungroupTranslation } from '../core/load';
import stableJson from 'json-stable-stringify';
import { AdapterBase } from './adapter-base';
import { toGroupedTranslation } from '../cli/utils';

export class JsonAdapter extends AdapterBase {

    protected async doLoadFile(content: string): Promise<Translation> {
        const parsed = JSON.parse(content) as GroupedTranslation;
        return ungroupTranslation(parsed);
    }

    protected async contentFor(translation: Translation) {
        const data = toGroupedTranslation(translation);
        const content = stableJson(data, { space: '    ' });
        return content!;
    }
}