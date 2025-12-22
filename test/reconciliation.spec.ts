import { describe, it, expect } from 'bun:test';
import { reconciliate } from '../src/cli/reconciliate';
import { CollectResult } from '../src/cli/interfaces';


describe('Reconciliation', () => {

    function recon(translated: CollectResult, orig: CollectResult) {
        return reconciliate({
            resources: translated,
            sourceLanguage: 'en',
            targetLanguage: 'fr',
        }, {
            resources: orig,
            targetLanguage: 'en',
        });
    }

    function setupAB() {
        const orig: CollectResult = {
            a: { target: 'Sentence A' },
            b: { target: 'Sentence B' },
        };
        const trans: CollectResult = {
            a: { source: 'Sentence A', target: 'Phrase A' },
            b: { source: 'Sentence B', target: 'Phrase B' },
        };
        return { orig, trans };
    }

    it('does nothing when ok', () => {
        const { orig, trans } = setupAB();
        const { dirty, missing, same } = recon(trans, orig);
        expect(dirty).toEqual(0);
        expect(missing).toEqual(0);
        expect(same).toEqual([]);
    });


    it('marks as dirty', () => {
        const { orig, trans } = setupAB();

        // change 'in code' sentence
        orig.a.target = 'New sentence A';

        const { dirty, missing, same } = recon(trans, orig);
        expect(dirty).toEqual(1);
        expect(missing).toEqual(0);
        expect(same).toEqual([]);
        expect(trans.a.dirty).toBe(true);
        expect(trans.a.source).toEqual('New sentence A');
    });


    it('adds new sentence', () => {
        const { orig, trans } = setupAB();

        // add new 'in code' sentence
        orig.c = { target: 'Sentence C' };

        const { dirty, missing, same } = recon(trans, orig);
        expect(dirty).toEqual(0);
        expect(missing).toEqual(1);
        expect(same).toEqual([]);
        expect(trans.c.source).toEqual('Sentence C');
        expect(trans.c.target).toBeUndefined();
    });



    it('finds on ID change', () => {
        const { orig, trans } = setupAB();

        // add new 'in code' sentence
        orig.newb = orig.b;
        delete orig.b;

        const { dirty, missing, same } = recon(trans, orig);
        expect(dirty).toEqual(0);
        expect(missing).toEqual(0);
        expect(same).toEqual([]);
        expect(trans.b).toBeUndefined();
        expect(trans.newb).toBeDefined();
        expect(trans.newb.source).toEqual('Sentence B');
    });


    it('finds on ID and content change change', () => {
        const { orig, trans } = setupAB();

        // add new 'in code' sentence
        orig.newb = orig.b;
        orig.newb.target = 'Sentence B bis';
        delete orig.b;

        const { dirty, missing, same } = recon(trans, orig);
        expect(dirty).toEqual(1); // source changed => dirty
        expect(missing).toEqual(0);
        expect(same).toEqual([]);
        expect(trans.b).toBeUndefined();
        expect(trans.newb).toBeDefined();
        expect(trans.newb.source).toEqual('Sentence B bis');
        expect(trans.newb.target).toEqual('Phrase B');
    });



    it('finds multiple ID and content change', () => {
        const { orig, trans } = setupAB();

        // add new 'in code' sentence
        orig.newa = orig.a;
        orig.newb = orig.b;
        orig.newa.target = 'Sentence A bis';
        orig.newb.target = 'Sentence B bis';
        delete orig.b;
        delete orig.a;

        const { dirty, missing, same } = recon(trans, orig);
        expect(dirty).toEqual(2); // source changed => dirty
        expect(missing).toEqual(0);
        expect(same).toEqual([]);
        expect(trans.a).toBeUndefined();
        expect(trans.b).toBeUndefined();
        expect(trans.newa).toBeDefined();
        expect(trans.newb).toBeDefined();
        expect(trans.newa.source).toEqual('Sentence A bis');
        expect(trans.newb.source).toEqual('Sentence B bis');
        expect(trans.newa.target).toEqual('Phrase A');
        expect(trans.newb.target).toEqual('Phrase B');
    });
});