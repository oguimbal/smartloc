import { sha1 } from 'js-sha1';
import React from 'react';

export function autoGenerateId(str: TemplateStringsArray | string[]): string {
    const sha = sha1(str.join('|'));
    return 'sha1.' + sha;
}

export function getLocaleCode(locale: string) {
    return locale && /^[a-z]+/.exec(locale.toLowerCase())?.[0] || undefined;
}


export function asFragment(children: React.ReactNode[]): React.ReactNode {
    if (children.length === 1) {
        return children[0];
    }
    return <React.Fragment>{children.map((x, i) => {
        if (React.isValidElement(x) && !x.key) {
            return <React.Fragment key={i}>{x}</React.Fragment>;
        }
        return x;
    })}</React.Fragment>;
}