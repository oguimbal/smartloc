#!/usr/bin/env node

import yargs, { BuilderCallback, Argv } from 'yargs';
import path from 'path';
import { collect } from './collect';
import { reconciliate } from './reconciliate';
import { getAdapter } from '../adapters';

// === arguments parsing ===

function isValidLocale(x: string) {
    return typeof x === 'string' && !!x && /^[a-zA-Z]+(\-[a-zA-Z]+)?$/.test(x);
}

function defaultArgs<T>(b: Argv<T>): Argv<T & { format: string; outDir: string; }> {
    return b.positional('format', {
            describe: 'The output format',
            choices: ['json', 'xliff'],
            default: 'xliff',
        })
        .positional('outDir', {
            describe: 'The translation output directory',
            default: 'i18n',
            normalize: true,
        })
}

const ret = yargs
.scriptName('smartloc')
.command('add', 'Add a new locale', b => defaultArgs(b).demandCommand()
    , args => {
        console.log(args);
    })
.command('collect', 'Collects all strings to translate', b => defaultArgs(b)
    .positional('source', {
        describe: 'The source directory where to look for translations (defaults to current working directory)',
        type: 'string',
        normalize: true,
    })
    .positional('defaultLocale', {
        description: 'Sets the default locale (the locale used in code for your strings)',
        type: 'string',
        coerce: x => {
            if (!isValidLocale(x)) {
                console.error('Invalid locale ' + x);
                process.exit(1);
            }
            return x;
        },
    })
    .positional('generateDefault', {
        description: 'Also generates a translation file for the default locale',
        type: 'boolean',
    })
    .positional('generateDefault', {
        description: 'Also generates the default locale translation file (which does not need to be translated)',
        type: 'boolean',
    })
    .positional('locales', {
        description: 'Comma separated list of locales to generate (others than the default one)',
        type: 'string',
        coerce: x => {
            if (typeof x !== 'string' || !x || !/^[a-zA-Z]+(\-[a-zA-Z]+)?$/.test(x)) {
                console.error('Invalid locale ' + x);
                process.exit(1);
            }
            return x;
        },
    })
    , async args => {
        try {

            const locales = args.locales?.split(',')
                .map(x => x.trim())
                .filter(x => x !== args.defaultLocale);
            if (!locales?.length) {
                console.error('You must provide at least one locale thats different from your default locale')
                process.exit(1);
            }
            if (locales.some(x => !isValidLocale(x))) {
                console.error('--locales argument is invalid')
                process.exit(1);
            }

            // collect from sources
            console.log('Collecting from sources...');
            const {collected, files} = collect(args.source, args.defaultLocale);
            console.log(`...found ${Object.keys(collected.resources).length} translatable items over ${files} files with default language ${collected.targetLanguage}`);

            // create adapter
            const outdir = path.join(process.cwd(), args.outDir);
            const adapter = getAdapter(args.format, outdir);

            // load other locales
            const others = (await adapter.loadLocales(locales))
                .filter(x => x.targetLanguage !== collected.targetLanguage);

            console.log(`Updating ${others.length} other translations...`);

            // reconciliate existing
            for (const l of others) {
                const collectedCopy = JSON.parse(JSON.stringify(collected));
                const {dirty, missing, same} = reconciliate(l, collectedCopy);
                const feats: string[] = [];
                if (dirty) {
                    feats.push(`${dirty} dirty translations (source changed)`);
                }
                if (missing) {
                    feats.push(`${missing} missing translations`);
                }
                if (same.length) {
                    feats.push(`${same.length} translations matching original (ex: ${same[0]})`);
                }
                if (!feats.length) {
                    console.log(`${l.targetLanguage} is OK ♥`);
                } else {
                    console.log(`${l.targetLanguage} has ${feats.join(', ')}`);
                }
            }

            // write others
            console.log(`Writing results...`);
            for (const l of others) {
                await adapter.write(l);
            }

            if (args.defaultLocale) {
                await adapter.write(collected);
            }
            console.log(`I'm done ♥`);
        } catch (e) {
            console.error('Command failed', e);
            process.exit(1);
        }
    })
    .argv;
