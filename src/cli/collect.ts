import fs from 'fs';
import path from 'path';
import giparser from 'gitignore-parser';
import { CollectResult, Translation } from './interfaces';
import { autoGenerateId } from '../core/utils';

export interface Loc {
    id: string;
    file: string;
    line: number;
    source: string;
}

export function collect(source: string, forceLocale?: string): { collected: Translation; files: number } {
    source = source
        ? path.join(process.cwd(), source)
        : process.cwd();
    // parse gitignore
    // todo: parse .gitignore files in nested directories.
    let ignore: { accepts(path: string): boolean; denies(path: string): boolean; };
    const gitIgnorePath = path.join(source, '.gitignore');
    if (fs.existsSync(gitIgnorePath)) {
        const content = fs.readFileSync(gitIgnorePath, 'utf8');
        ignore = giparser.compile(content);
    } else {
        ignore = giparser.compile('');
    }


    function* walk(dirRelative: string) {
        try {
            const files = fs.readdirSync(path.join(source, dirRelative));
            for (const file of files) {
                const filepath = path.join(source, dirRelative, file);
                const fileRelative = path.join(dirRelative, file);
                if (ignore.denies(fileRelative)) {
                    continue;
                }
                const stats = fs.statSync(filepath);
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
    let defaultLocale: { val: string; file: string; };
    let fcount = 0;
    for (const f of walk('')) {
        const ext = f.toLowerCase();
        if (!ext.endsWith('.js') && !ext.endsWith('.ts')) {
            continue;
        }
        fcount++;
        try {
            const content = fs.readFileSync(path.join(source, f), 'utf8');

            // === try to find setDefaultLocale()
            if (!forceLocale) {
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

            collectFromSource(content, ids, all, f);

        } catch (e) {
            console.error('Failed to read file ' + f);
        }
    }

    // === WRITE RESULT ===
    const result: CollectResult = {};
    for (const v of all) {
        result[v.id] = {
            target: v.source,
        };
    }

    const targetLanguage = defaultLocale?.val || forceLocale;
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


export function collectFromSource(content: string, ids: Map<string, Loc>, all: Loc[], f?: string) {


    // === parse loc() calls
    const re = /\bloc\s*(\(\s*('|")([a-zA-Z0-9\-_\s\.]+)('|")\s*\))?\s*`([^`]+)`/g;
    let m: RegExpExecArray;
    while (m = re.exec(content)) {
        let id = m[3];
        const val = m[5];

        // parse format
        const reFormat = /\$\{([^\}]+)\}/g;
        let fm: RegExpExecArray;
        let index = 0;
        let cnt = 0;
        const parts: string[] = [];
        const idParts: string[] = id ? null : [];
        while (fm = reFormat.exec(val)) {
            const literal = val.substr(index, fm.index - index);
            parts.push(literal);
            idParts?.push(literal);
            index = fm.index + fm[0].length;
            parts.push('{', cnt.toString(), '}');
            cnt++;
        }
        // add trailing
        idParts?.push(val.substr(index));
        parts.push(val.substr(index));


        const raw = parts.join('');
        id = id || autoGenerateId(idParts);
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
        };
        all.push(found);
        ids.set(id, found);
    }
}