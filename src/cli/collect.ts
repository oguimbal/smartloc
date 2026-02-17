import fs from 'fs-extra';
import path from 'path';
import giparser from 'gitignore-parser';
import type { CollectResult, Translation } from '../core/load';
import type { IFormatAdapter } from './interfaces';
import { autoGenerateId } from '../core/utils';
import util from 'util';
export interface Loc {
    id: string;
    file: string | undefined;
    line: number;
    source: string;
    plural?: boolean;
}

export async function collect(source: string, adapter: IFormatAdapter, opts?: {
    additionalSimpleTag?: SimpleTagParser;
    forceLocale?: string
}): Promise<{ collected: Translation; files: number }> {
    source = source
        ? path.join(process.cwd(), source)
        : process.cwd();
    // parse gitignore
    // todo: parse .gitignore files in nested directories.
    let ignore: { accepts(path: string): boolean; denies(path: string): boolean; };
    const gitIgnorePath = path.join(source, '.gitignore');
    if (await fs.pathExists(gitIgnorePath)) {
        const content = await fs.readFile(gitIgnorePath, 'utf8');
        ignore = giparser.compile(content);
    } else {
        ignore = giparser.compile('');
    }


    async function* walk(dirRelative: string): AsyncIterableIterator<string> {
        try {
            const files = await fs.readdir(path.join(source, dirRelative));
            for (const file of files) {
                const filepath = path.join(source, dirRelative, file);
                const fileRelative = path.join(dirRelative, file);
                if (ignore.denies(fileRelative)) {
                    continue;
                }
                const stats = await fs.stat(filepath);
                if (stats.isDirectory()) {
                    yield* walk(fileRelative);
                } else {
                    if (ignore.accepts(fileRelative)) {
                        yield fileRelative;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to read directory ' + dirRelative);
        }
    }

    const ids = new Map<string, Loc>();
    const all: Loc[] = [];
    let defaultLocale: { val: string; file: string; } | undefined = undefined;
    let fcount = 0;
    for await (const f of walk('')) {
        const ext = f.toLowerCase();
        if (!ext.endsWith('.js') && !ext.endsWith('.ts') && !ext.endsWith('.jsx') && !ext.endsWith('.tsx')) {
            continue;
        }
        fcount++;
        try {
            const content = await fs.readFile(path.join(source, f), 'utf8');

            // === try to find setDefaultLocale()
            if (!opts?.forceLocale) {
                const defLoc = /\bsetDefaultLocale\s*\(\s*('|")([a-zA-Z\-]+)('|")\s*\)/.exec(content);
                const newDefLoc = defLoc?.[2];
                if (newDefLoc) {
                    if (defaultLocale && defaultLocale.val !== newDefLoc) {
                        console.error(`Ambiguous default locale. Found '${newDefLoc}' in ${f}, but was defined already defined as '${defaultLocale.val}' in ${defaultLocale.file}. Please use --locale:${defaultLocale.val}`)
                    }
                    defaultLocale = {
                        file: f,
                        val: newDefLoc,
                    };
                }
            }

            collectFromSource(content, ids, all, f, opts?.additionalSimpleTag);

        } catch (e) {
            console.error('Failed to read file ' + f + ': ' + util.inspect(e));
        }
    }

    // === load default locale ===
    const targetLanguage = defaultLocale?.val || opts?.forceLocale;
    const origFile = targetLanguage ? await adapter.loadLocale(targetLanguage) : null;

    // === WRITE RESULT ===
    const result: CollectResult = {};
    for (const v of all) {
        if (v.plural) {

            // Pluralizable strings must also be "transalted" in source language,
            //  since the code will only contain the pluralized form
            // => they must be marked as dirty if need be.
            const orig = origFile?.resources?.[v.id];
            let singular: string | null = null;
            let dirty: boolean | undefined = undefined;
            if (orig?.target && typeof orig.target !== 'string') {
                // if the plural has changed, or if there is no singlar in orig file,
                //  then it must be fixed
                if (!orig.target.singular || orig.target.plural !== v.source) {
                    dirty = true;
                }
                singular = orig.target?.singular ?? null;
            }

            result[v.id] = {
                target: {
                    singular,
                    plural: v.source,
                },
                dirty,
            };
        } else {
            // simple translations are never dirty: code is law
            result[v.id] = {
                target: v.source,
            };
        }
    }

    if (!targetLanguage) {
        console.error('Cannot infer the default locale. Either call setDefaultLocale() in analyzed sources, or set the --defaultLocale argument');
        process.exit(1);
    }
    const collected = {
        resources: result,
        targetLanguage,
    };
    return { collected, files: fcount };
}


export function collectFromSource(content: string, ids: Map<string, Loc>, all: Loc[], f?: string, additionalSimpleTag?: SimpleTagParser) {


    // === parse loc() calls
    const re = /\bloc(\.plural\([^\)]+\))?\s*(\(\s*('|")([^'"\n]+)('|")\s*(?:,\s*)?\))?\s*`([^`]*)`/g;
    let m: RegExpExecArray | null;
    while (m = re.exec(content)) {
        const plural = m[1];
        let id = m[4];
        const val = m[6];

        // parse format
        const reFormat = /\$\{([^\}]+)\}/g;
        let fm: RegExpExecArray | null;
        let index = 0;
        let cnt = 0;
        const parts: string[] = [];
        const idParts: string[] | null = id ? null : [];
        while (fm = reFormat.exec(val!)) {
            const literal = val!.substr(index, fm.index - index);
            parts.push(literal);
            idParts?.push(literal);
            index = fm.index + fm[0].length;
            parts.push('{', cnt.toString(), '}');
            cnt++;
        }
        // add trailing
        idParts?.push(val!.substr(index));
        parts.push(val!.substr(index));


        const raw = parts.join('');
        id = id || autoGenerateId(idParts!);
        const exists = ids.get(id);
        // check no dupplicate
        if (exists && exists.source !== raw) {
            if (f === exists.file) {
                console.error(`Duplicate translation id '${id}' found in ${f} but was already defined in ${exists.file}`);
            } else {
                console.error(`Duplicate translation id '${id}' found in ${f}`);
            }
            continue;
        }


        const found: Loc = {
            file: f,
            id,
            line: 0, // todo
            source: raw,
            plural: plural ? true : undefined,
        };
        all.push(found);
        ids.set(id, found);
    }

    if (additionalSimpleTag) {
        for (const string of additionalSimpleTag(content)) {
            const id = autoGenerateId([string]);
            const exists = ids.get(id);
            if (exists && exists.source !== string) {
                console.error(`Duplicate translation id '${id}' found in ${f} but was already defined in ${exists.file}`);
            } else {
                console.error(`Duplicate translation id '${id}' found in ${f}`);
            }
            const found: Loc = {
                file: f,
                id,
                line: 0, // todo
                source: string,
                plural: undefined,
            };
            all.push(found);
            ids.set(id, found);
        }
    }
}


type SimpleTagParser = (content: string) => IterableIterator<string>;

export function makeSimpleTagParser(syntax: string): SimpleTagParser {
    // detect string placeholder
    const i = syntax.indexOf('*');
    if (i === -1) {
        throw new Error('Invalid syntax for simple tag: ' + syntax);
    }
    const prefix = syntax.substring(0, i);
    const suffix = syntax.substring(i + 1);
    return function* parse(content: string) {
        let position = 0;
        while (position < content.length) {
            const idx = content.indexOf(prefix, position);
            const strChar = content[idx + prefix.length];
            if (strChar !== '"' && strChar !== "'" && strChar !== '`') {
                // not a match... restart
                position = idx + prefix.length;
                continue;
            }
            const stringStart = idx + prefix.length + 1;
            let stringEnd = stringStart;
            let string: string | undefined = undefined;
            while (stringEnd < content.length) {
                if (content[stringEnd] === strChar) {
                    // yep, that's a string
                    string = content.substring(stringStart, stringEnd);
                    break;
                }
                stringEnd++;
            }
            // skip string closing quote
            stringEnd++;
            if (!string) {
                // not a match... restart
                position = idx + prefix.length;
                continue;
            }
            // check suffix
            if (content.substring(stringEnd, stringEnd + suffix.length) !== suffix) {
                // not a match... restart
                position = idx + prefix.length;
                continue;
            }
            yield string;
            position = stringEnd + suffix.length;
        }
    };
}
