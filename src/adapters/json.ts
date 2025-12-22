import { Translation, GroupedTranslation } from '../cli/interfaces';
import stableJson from 'json-stable-stringify';
import { toGroupedTranslation, ungroupTranslation } from '../cli/utils';
import { AdapterBase } from './adapter-base';

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