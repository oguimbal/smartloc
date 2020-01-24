import { Translation, CollectItem } from './interfaces';
import levenshtein from 'js-levenshtein';
import diacritics from 'diacritics';

const cache = {};
function clean(str: string) {
    if (cache[str]) {
        return cache[str];
    }
    return cache[str] = diacritics.remove(str.toLowerCase().trim());
}

export function reconciliate(trans: Translation, def: Translation) {
    // source is the new one
    trans.sourceLanguage = def.targetLanguage;

    // stores which translations do not exist in code anymore
    const translatedLost: {[original: string]: CollectItem; } = {};

    function updateWithOrig(translated: CollectItem, origId: string, orig: CollectItem) {
        if (translated.source && translated.source !== orig.target) {
            translated.dirty = true;
        }
        translated.source = orig.target;
        trans.resources[origId] = translated;
        // remove it from 'def'
        delete def.resources[origId];
    }

    // update source lines
    for (const [id, value] of Object.entries(trans.resources)) {
        const d = def.resources[id];
        if (d) {
            // already exists => update
            updateWithOrig(value, id, d);
        } else {
            // does not exist anymore => remove, but keep in mind.
            delete trans.resources[id];
            if (value.source) {
                translatedLost[clean(value.source)] = value;
            }
        }
    }

    // for each NEW translations missing
    // try to reconciliate with those which have changed id, but still same translation.
    for (const [id, value] of Object.entries(def.resources)) {
        const cleanTarget = clean(value.target);
        if (translatedLost[cleanTarget]) {
            updateWithOrig(translatedLost[cleanTarget], id, value);
        }
    }

    // try to reconciliate with strings that look alike
    // nb: avoid doing that when too much deleted translations: Levenshtein distance computation is expensive
    const lostKeys = Object.keys(translatedLost);
    if (Object.keys(def.resources).length * lostKeys.length < 5000 && lostKeys.length > 0)  {
        const reconc: {origId: string; orig: CollectItem; translatedLostSource: string; distance: number}[] = [];
        for (const lk of lostKeys) {
            reconc.push(...Object.entries(def.resources)
                .map(([id, orig]) => {
                    // distance between the lost source & the new source
                    const distance = levenshtein(lk, clean(orig.target));
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
    for (const [id, value] of Object.entries(def.resources)) {
        trans.resources[id] = {
            source: value.target,
        };
    }

    // try to reconciliate

    // count things
    let missing = 0;
    const same: string[] = [];
    let dirty = 0;
    for (const [k, c] of Object.entries(trans.resources)) {
        if (!c.target) {
            missing++;
        } else if (c.target === c.source) {
            same.push(k);
        }
        if (c.dirty) {
            dirty++;
        }
    }
    return {missing, same, dirty};
}