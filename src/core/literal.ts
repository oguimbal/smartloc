import React from 'react';
import { LocLiteral, LocStr, ILocaleDef, ILiteralLocalizer } from './interfaces';

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
    private dateTimeFormat: Intl.DateTimeFormat;
    private dateFormat: Intl.DateTimeFormat;

    constructor(private locale: ILocaleDef) {
        this.numbers = new Intl.NumberFormat(locale.id);
        // Format for dates with time (equivalent to moment's 'LLL')
        this.dateTimeFormat = new Intl.DateTimeFormat(locale.id, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
        // Format for dates without time (equivalent to moment's 'LL')
        this.dateFormat = new Intl.DateTimeFormat(locale.id, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    localize(data: LocLiteral, react: false): string;
    localize(data: LocLiteral, react: true): React.ReactNode;
    localize(data: LocLiteral, react: boolean): string | React.ReactNode {
        if (typeof data === 'string') {
            return data;
        }
        if (typeof data === 'number') {
            return this.numbers.format(data);
        }
        if (data instanceof Date) {
            // Check if the date has a time component (non-zero hours or minutes)
            if (data.getHours() || data.getMinutes()) {
                return this.dateTimeFormat.format(data);
            }
            return this.dateFormat.format(data);
        }
        if (isLocStr(data)) {
            return data.toString(this.locale);
        }
        if (react) {
            return data as React.ReactNode;
        } else {
            if (isLocStr(data)) {
                return data.toString(this.locale);
            }
            console.error(new Error('Cannot use React elements in LocStr elements when not used in a React renderer'));
            return '';
        }
    }
}
