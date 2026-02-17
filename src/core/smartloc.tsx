import { getLocale, getDefaultLocale, getCurrentLocale, subscribeToLocaleChange, listLocaleDefs } from './locale-list';
import { ILocaleDef, InternalLocStr, LocLiteral, LocStr } from './interfaces';
import { setIsLoc } from './literal';
import React, { useState } from 'react';
import { asFragment } from './utils';

let langCtx: ILocaleDef[] | null = null;
let serialContext: SerializationContextOptions | null = null;

export function useAsString(loc: LocStr | string | null): string | null;
export function useAsString(loc: LocStr | string | undefined): string | undefined;
export function useAsString(loc: LocStr | string | undefined): string | undefined;
export function useAsString(loc: LocStr | string | null | undefined): string | null | undefined {
    const [, setCount] = useState(0);
    React.useEffect(() => {
        const unsub = subscribeToLocaleChange(() => setCount(c => c + 1));
        return unsub;
    }, []);
    return loc?.toString();
}


export interface SerializationContextOptions {
    /** HOw non self-descriptive (MultiLoc, SingleLoc, ...) will be transformed. Defaults to 'id'.
     *
     * id => will serialize its ID ... the context of deserialization will be required to have the given translation
     * skip => will be left as it (=> serialization will translate it)
     * toMulti => translates to all registered languages, and serializes as a 'multi'
     */
    nonSelfDescriptive?: 'skip' | 'toMulti' | 'id';
}
/**
 * Execute something in the given locales context.
 * @param acceptLanguages The accepted languages, by order of preference
 * @param action Action to perform (usually a JSON.serialize() or a .toString() operation)
 **/
export function withLocales<T = void>(acceptLanguages: string[], action: () => T) {
    if (!acceptLanguages || !acceptLanguages.length) {
        return action();
    }
    const oldLangCtx = langCtx;
    try {
        // set accepted languages
        langCtx = acceptLanguages
            .map(getLocale)
            .filter(x => !!x);

        // perform action
        return action();
    } finally {
        langCtx = oldLangCtx;
    }
}

/**
 * Execute something in a context where .toJson() loc strings
 * will be serialized into a form that is parsable via jsonParseLocalized()
 */
export function withSerializationContext<T = void>(action: () => T, options?: SerializationContextOptions) {
    const os = serialContext;
    try {
        serialContext = options || {};
        return action();
    } finally {
        serialContext = os;
    }
}


interface SmartlocProps {
    id: string,
    literals: TemplateStringsArray | null;
    placeholders: LocLiteral[] | null;
    count: number | undefined;
}

function createKind<props extends object>(opts: {
    name: string;
    render: (props: props, locale: ILocaleDef) => React.ReactNode | null;
    toString: (props: props, locale: ILocaleDef) => string | null;
    toJson: (props: props) => any;
}) {

    const Renderer = {
        [opts.name]: class extends React.Component<props, { locale: ILocaleDef | null }> {
            private rerender = () => this.setState({
                locale: getCurrentLocale(),
            });
            private unsub?: () => void;

            override componentDidMount(): void {
                this.unsub = subscribeToLocaleChange(this.rerender);

            }

            override componentWillUnmount() {
                this.unsub?.();
            }

            override render(): React.ReactNode {
                const locale = this.state?.locale;
                if (locale) {
                    const rendered = opts.render(this.props, locale);
                    if (rendered) {
                        return rendered;
                    }
                }
                const currentLocale = getCurrentLocale(true);
                if (currentLocale) {
                    const rendered = opts.render(this.props, currentLocale);
                    if (rendered) {
                        return rendered;
                    }
                }
                const defaultLocale = getDefaultLocale();
                if (defaultLocale) {
                    const rendered = opts.render(this.props, defaultLocale);
                    if (rendered) {
                        return rendered;
                    }
                }
                return null;
            }
        },
    }[opts.name];

    const Proto = {
        [opts.name]: class implements InternalLocStr {
            get locKind() {
                return opts.name;
            }
            // will be set the hackky way, see creator below
            props!: props;

            toJSON() {
                if (!serialContext) {
                    return this.toString();
                }
                return opts.toJson(this.props);
            }

            toString(locale?: string | ILocaleDef | null): string {
                if (typeof locale === 'string') {
                    locale = getLocale(locale);
                }

                if (locale) {
                    const localized = opts.toString(this.props, locale)
                    if (localized) {
                        return localized;
                    }
                }
                if (langCtx?.length) {
                    for (const l of langCtx) {
                        const localized = opts.toString(this.props, l);
                        if (localized) {
                            return localized;
                        }
                    }
                }

                // try current locale
                const currentLocale = getCurrentLocale(true);
                if (currentLocale) {
                    const localized = opts.toString(this.props, currentLocale);
                    if (localized) {
                        return localized;
                    }
                }

                // fallback to default locale
                const defaultLocale = getDefaultLocale();
                if (!defaultLocale) {
                    throw new Error('You must specify default locale via setDefaultLocale() before using localization');
                }
                // default locale cannot return null
                const def = opts.toString(this.props, defaultLocale);
                if (def === null || def === undefined) {
                    throw new Error('Cannot get a translation'); // should not happen
                }
                return def;
            }

            transform(transformer: (x: string) => string): LocStr {
                return transformed({
                    parent: this,
                    transformer,
                });
            }

            useAsString(): string {
                const [, setCount] = useState(0);
                React.useEffect(() => {
                    const unsub = subscribeToLocaleChange(() => setCount(c => c + 1));
                    return unsub;
                }, []);
                return this.toString();
            }
        }
    }[opts.name];



    // trick to create a function that is named like the given name
    const creator = {
        [opts.name](props: props): LocStr {
            // This is a dirty hack to create some item that will both be recognized by React as a valid element,
            // but that also behaves as a LocStr with the appropriate methods.
            // 1) create a react element
            const e = React.createElement(Renderer, props);

            // 2) create a new instance of our LocStr kind
            const ret = Object.create(Proto.prototype);

            // 3) raw-copy what the react element has as  properties
            //   ... this work because React.createElement() actually only creates a raw frozen object with some properties.
            //    see createElement() source code
            const eProps = Object.getOwnPropertyDescriptors(e);
            Object.defineProperties(ret, eProps);

            // 4) set the isLoc flag to true so isLocStr() will recognize this instance
            setIsLoc(ret); // this will freeze the object
            return ret;
        }
    }[opts.name];

    return creator;
}



export const smartLoc = createKind<SmartlocProps>({
    name: 'SmartLoc',
    render(props, locale) {
        return locale.localize(props.id, props.count ?? null, props.literals, props.placeholders, true);
    },
    toString(props, locale) {
        return locale.localize(props.id, props.count ?? null, props.literals, props.placeholders, false);
    },
    toJson(props) {
        switch (serialContext!.nonSelfDescriptive) {
            case 'skip':
                return this;
            case 'toMulti':
                const multi: Record<string, string> = {};
                for (const l of listLocaleDefs()) {
                    const str = this.toString(props, l);
                    if (str) {
                        multi[l.id] = str;
                    }
                }
                // tslint:disable-next-line: no-use-before-declare
                return multiLoc(multi).toJSON();
            default:
                if (props.placeholders?.length || props.count !== undefined) {
                    return {
                        i18n: props.id,
                        data: props.placeholders,
                        count: props.count,
                    };
                    // throw new Error(`Cannot serialize smartloc instance "${this.id}" which has placeholders ("\${}" in string definition). Please use another SerializationContextOption.nonSelfDescriptive option`);
                }
                return `i18n/id:${props.id}`;
        }
    },

});

export const transformed = createKind<{ parent: InternalLocStr; transformer: (x: string) => string; }>({
    name: 'TransformedLoc',
    render(props, _) {
        console.warn('Transformed localized string cannot be rendered as React nodes => fallback to parent rendering');
        return <>{props.parent}</>;
    },
    toString(props, locale) {
        const ret = props.parent.toString(locale);
        return props.transformer(ret);
    },
    toJson(props) {
        if (serialContext) {
            throw new Error('Cannot serialize transformed localized strings');
        }
        return props.parent.toJSON();
    },
});
export function singleLoc(text: string) {
    return _singleLoc({ text });
}

const _singleLoc = createKind<{ text: string }>({
    name: 'SingleLoc',
    render(props) {
        return props.text;
    },
    toString(props) {
        return props.text;
    },
    toJson(props) {
        return 'i18n/single:' + props.text;
    },
});


export const multiLoc = createKind<Record<string, string>>({
    name: 'MultiLoc',
    render(props, locale) {
        const t = this.toString(props, locale);
        if (!t) {
            return <></>;
        }
        return t;
    },
    toString(props, locale) {
        return props[locale.id] ?? props[locale.code ?? ''];
    },
    toJson(props) {
        const ret: Record<string, string> = {};
        for (const [k, v] of Object.entries(props)) {
            ret[`i18n:${k}`] = v;
        }
        return ret;
    }
});

export function joinArray(separator: string | LocStr, items: (string | LocStr)[]): LocStr {
    return _joinedArray({ items, separator });
}

const _joinedArray = createKind<{ separator: string | LocStr, items: (string | LocStr)[] }>({
    name: 'LocStringArray',
    render(props) {
        const elts: any[] = [];
        // locstrings are react-elements
        for (let i = 0; i < props.items.length; i++) {
            if (i) {
                elts.push(props.separator);
            }
            elts.push(props.items[i]);
        }
        return asFragment(elts);
    },
    toString(props, locale) {
        const sep = typeof props.separator === 'string' ? props.separator : props.separator.toString(locale);
        return props.items.map(item => item.toString(locale)).join(sep);
    },
    toJson() {
        throw new Error('Cannot transform a joined array to json');
    }
});