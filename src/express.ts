import { withLocales } from '.';
import parser from 'accept-language-parser';

const supportedMethods = ['json', 'send', 'jsonp'];

export interface SmartlocExpressOptions {
    /**  (optional) Waits for this promise before performing a translation. This might be for instance the promise that waits all locales to be declared via addLocale() loaded */
    waitFor?: Promise<any>;
    /** Custom resolution (will fall back on accept-language if this function does not return anything) */
    customLocaleResolver?: (req: any) => string | string[] | null | undefined | Promise<string | string[] | null | undefined>;
    /** Error logger (gives a chance to log resolution errors) */
    errorLogger?: (err: any) => void;
}

/**
 * Express middleware that will translate calls to .send(), .json() (etc...) based on the Accept-Language request header.
 */
export default function (options?: SmartlocExpressOptions) {
    const { errorLogger, customLocaleResolver, waitFor } = options ?? {};
    let waiter = waitFor;
    return function (req, res, next) {

        let locales: string[];

        function serve() {
            waiter = null;
            try {
                // === resolve locales from custom resolver
                if (!locales) {
                    const cust = customLocaleResolver(req);
                    if (typeof cust === 'string') {
                        locales = [cust];
                    } else if (cust instanceof Array) {
                        locales = cust;
                    } else if (cust) {
                        cust.then(resCust => {
                            if (typeof resCust === 'string') {
                                resCust = [resCust];
                            }
                            locales = resCust ?? [];
                            serve();
                        }, e => {
                            errorLogger?.(e);
                            serve();
                        })
                        return; // defered => method will be called again later.
                    }
                }

                // === resolve locales from headers
                if (!locales || !locales.length) {
                    const lh = req.headers['accept-language'];
                    if (!lh) {
                        next();
                        return; // => no locale... just serve without patching
                    }
                    locales = parser.parse(lh)
                        ?.map(x => x.region ? `${x.code}-${x.region}` : x.code);
                }

                // === override methods that sends potentially translatable content
                for (const k of supportedMethods) {
                    const orig = res[k];
                    res[k] = function (...args: any[]) {
                        return withLocales(locales, () => {
                            return orig.apply(this, args);
                        })
                    };
                }
                next();
                return;
            } catch (e) {
                errorLogger?.(e);
                next();
            }
        };


        // === serve if nothing to wait
        if (!waiter) {
            serve();
        } else {
            waiter.then(serve, serve);
        }

    }
}