import {withLocales} from '.';
import parser from 'accept-language-parser';

const supportedMethods = ['json', 'send', 'jsonp'];

/**
 * Express middleware that will translate calls to .send(), .json() (etc...) based on the Accept-Language request header.
 * @param waitFor (optional) Waits for this promise before performing a translation. This might be for instance the promise that waits all locales to be declared via addLocale() loaded
 */
export default function(waitFor?: Promise<any>) {
    return function (req, res, next) {
        const lh = req.headers['accept-language'];
        if (!lh) {
            return next();
        }
        function serve() {
            waitFor = null;
            // override methods that sends potentially translatable content
            for (const k of supportedMethods) {
                const orig = res[k];
                res[k] = function (...args: any[]) {
                    const l = parser.parse(lh)
                        ?.map(x => x.region ? `${x.code}-${x.region}` : x.code);
                    return withLocales(l, () => {
                        return orig.apply(this, args);
                    })
                };
            }
            next();
        };

        if (!waitFor) {
            serve();
        } else {
            waitFor.then(serve, serve);
        }
    }
}