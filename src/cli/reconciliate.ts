import type { Translation, CollectItem } from '../core/load';
import levenshtein from 'js-levenshtein';
import diacritics from 'diacritics';
import { deepEqual } from './utils';
import type { TranslationTarget } from '../core/interfaces';

const cache: Record<string, string> = {};
function asKey(t: TranslationTarget) {
    const str = typeof t === 'string' ? t : t.plural;
    if (cache[str]) {
        return cache[str];
    }
    return cache[str] = diacritics.remove(str.toLowerCase().trim());
}

export function reconciliate(translations: Translation, source: Translation) {
    // source is the new one
    translations.sourceLanguage = source.targetLanguage;

    // stores which translations do not exist in code anymore
    const translatedLost: { [original: string]: CollectItem; } = {};

    function updateWithOrig(trans: CollectItem, origId: string, src: CollectItem) {
        if (trans.source && !deepEqual(trans.source, src.target)) {
            trans.dirty = true;
        }
        trans.source = src.target ?? undefined;
        translations.resources[origId] = trans;
        // remove it from 'def'
        delete source.resources[origId];
    }

    // update source lines
    for (const [id, trans] of Object.entries(translations.resources)) {
        const d = source.resources[id];
        if (d) {
            // already exists => update
            updateWithOrig(trans, id, d);
        } else {
            // does not exist anymore => remove, but keep in mind.
            delete translations.resources[id];
            if (trans.source) {
                translatedLost[asKey(trans.source)] = trans;
            }
        }
    }

    // for each NEW translations missing
    // try to reconciliate with those which have changed id, but still same translation.
    for (const [id, value] of Object.entries(source.resources)) {
        if (!value.target) {
            continue;
        }
        const cleanTarget = asKey(value.target);
        if (translatedLost[cleanTarget]) {
            updateWithOrig(translatedLost[cleanTarget], id, value);
        }
    }

    // try to reconciliate with strings that look alike
    // nb: avoid doing that when too much deleted translations: Levenshtein distance computation is expensive
    const lostKeys = Object.keys(translatedLost);
    if (Object.keys(source.resources).length * lostKeys.length < 5000 && lostKeys.length > 0) {
        const reconc: { origId: string; orig: CollectItem; translatedLostSource: string; distance: number }[] = [];
        for (const lk of lostKeys) {
            reconc.push(...Object.entries(source.resources)
                .map(([id, orig]) => {
                    // distance between the lost source & the new source
                    const target = orig.target ? asKey(orig.target) : null;
                    const distance = target ? levenshtein(lk, target) : Infinity;
                    return {
                        origId: id,
                        orig,
                        translatedLostSource: lk,
                        distance: distance,
                    }
                })
                // forbids to much change
                .filter(x => x.distance < lk.length / 1.5)
            );
        }

        reconc.sort((a, b) => a.distance - b.distance);
        const done = new Set();
        for (const d of reconc) {
            if (done.has(d.origId)) {
                continue;
            }
            done.add(d.origId);
            updateWithOrig(translatedLost[d.translatedLostSource], d.origId, d.orig);
        }
    }

    // finally, add new translations...
    for (const [id, value] of Object.entries(source.resources)) {
        translations.resources[id] = {
            source: value.target ?? undefined,
        };
    }

    // try to reconciliate

    // count things
    let missing = 0;
    const same: string[] = [];
    let dirty = 0;
    for (const [k, c] of Object.entries(translations.resources)) {
        if (!c.target) {
            missing++;
            c.target = null; // so it is serialized as json
        } else if (c.target === c.source) {
            same.push(k);
        }
        if (c.dirty) {
            dirty++;
        }
    }
    return { missing, same, dirty };
}