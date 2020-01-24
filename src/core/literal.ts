import { LocLiteral, LocStr, ILocaleDef, ILiteralLocalizer } from './interfaces';
import moment from 'moment';

const locTag = Symbol('_localizable');
export function isLocStr(data: any): data is LocStr {
    return data && typeof data === 'object' && data[locTag];
}

export function setIsLoc(data: any) {
    data[locTag] = true;
    Object.freeze(data);
}

export class LiteralLocalizer implements ILiteralLocalizer {
    private numbers: Intl.NumberFormat;
    constructor(private locale: ILocaleDef) {
        this.numbers = new Intl.NumberFormat(locale.id);
    }
    localize(data: LocLiteral): string {
        if (typeof data === 'string') {
            return data;
        }
        if (typeof data === 'number') {
            return this.numbers.format(data);
        }
        if (data instanceof Date) {
            data = moment(data);
        }
        if (moment.isMoment(data)) {
            if (data.hour() || data.minute()) {
                return data.locale(this.locale.id).format('LLL');
            }
            return data.locale(this.locale.id).format('LL');
        }
        if (moment.isDuration(data)) {
            return data.locale(this.locale.id).humanize();
        }
        if (isLocStr(data)) {
            return data.toString(this.locale);
        }
        return checkNever(data);
    }
}

function checkNever(test: never) {
    return '';
}