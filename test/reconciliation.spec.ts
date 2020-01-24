import 'mocha';
import {expect, assert} from 'chai';
import {reconciliate} from '../src/cli/reconciliate';
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
        return {orig, trans};
    }

    it ('does nothing when ok', () => {
        const {orig, trans} = setupAB();
        const {dirty, missing, same} = recon(trans, orig);
        expect(dirty).to.equal(0);
        expect(missing).to.equal(0);
        expect(same).to.deep.equal([]);
    });


    it ('marks as dirty', () => {
        const {orig, trans} = setupAB();

        // change 'in code' sentence
        orig.a.target = 'New sentence A';

        const {dirty, missing, same} = recon(trans, orig);
        expect(dirty).to.equal(1);
        expect(missing).to.equal(0);
        expect(same).to.deep.equal([]);
        assert.isTrue(trans.a.dirty);
        expect(trans.a.source).to.equal('New sentence A');
    });


    it ('adds new sentence', () => {
        const {orig, trans} = setupAB();

        // add new 'in code' sentence
        orig.c = { target: 'Sentence C' };

        const {dirty, missing, same} = recon(trans, orig);
        expect(dirty).to.equal(0);
        expect(missing).to.equal(1);
        expect(same).to.deep.equal([]);
        expect(trans.c.source).to.equal('Sentence C');
        assert.notExists(trans.c.target);
    });



    it ('finds on ID change', () => {
        const {orig, trans} = setupAB();

        // add new 'in code' sentence
        orig.newb = orig.b;
        delete orig.b;

        const {dirty, missing, same} = recon(trans, orig);
        expect(dirty).to.equal(0);
        expect(missing).to.equal(0);
        expect(same).to.deep.equal([]);
        assert.notExists(trans.b);
        assert.exists(trans.newb);
        expect(trans.newb.source).to.equal('Sentence B');
    });


    it ('finds on ID and content change change', () => {
        const {orig, trans} = setupAB();

        // add new 'in code' sentence
        orig.newb = orig.b;
        orig.newb.target = 'Sentence B bis';
        delete orig.b;

        const {dirty, missing, same} = recon(trans, orig);
        expect(dirty).to.equal(1); // source changed => dirty
        expect(missing).to.equal(0);
        expect(same).to.deep.equal([]);
        assert.notExists(trans.b);
        assert.exists(trans.newb);
        expect(trans.newb.source).to.equal('Sentence B bis');
        expect(trans.newb.target).to.equal('Phrase B');
    });



    it ('finds multiple ID and content change', () => {
        const {orig, trans} = setupAB();

        // add new 'in code' sentence
        orig.newa = orig.a;
        orig.newb = orig.b;
        orig.newa.target = 'Sentence A bis';
        orig.newb.target = 'Sentence B bis';
        delete orig.b;
        delete orig.a;

        const {dirty, missing, same} = recon(trans, orig);
        expect(dirty).to.equal(2); // source changed => dirty
        expect(missing).to.equal(0);
        expect(same).to.deep.equal([]);
        assert.notExists(trans.a);
        assert.notExists(trans.b);
        assert.exists(trans.newa);
        assert.exists(trans.newb);
        expect(trans.newa.source).to.equal('Sentence A bis');
        expect(trans.newb.source).to.equal('Sentence B bis');
        expect(trans.newa.target).to.equal('Phrase A');
        expect(trans.newb.target).to.equal('Phrase B');
    });
});