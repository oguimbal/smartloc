import 'mocha';
import { expect, assert } from 'chai';
import { loc, setDefaultLocale, addLocale, withLocales, clearLocales, toJsonStorable, SingleLoc, MultiLoc, jsonParseLocalized } from '../src';
import { withSerializationContext } from '../src/core/smartloc';


describe('Json serialization', () => {

    beforeEach(() => {
        clearLocales();
        setDefaultLocale('en-US');
    })

    it('toJsonStorable() handles singleloc values', () => {
        const str = new SingleLoc(`a translation`);
        expect(toJsonStorable(str)).to.equal('i18n/multi:a translation')
    });

    it('toJsonStorable() handles singleloc props', () => {
        const str = { value: new SingleLoc(`a translation`) };
        expect(toJsonStorable(str)).to.deep.equal({ value: 'i18n/multi:a translation' })
    });


    it('toJsonStorable() handles singleloc arrays', () => {
        const str = { value: [new SingleLoc(`first`), new SingleLoc(`second`)] };
        expect(toJsonStorable(str)).to.deep.equal({ value: ['i18n/multi:first', 'i18n/multi:second'] })
    });


    it('toJsonStorable() handles multiloc', () => {
        const str = { value: new MultiLoc({ fr: 'FR value', en: 'EN value' }) };
        expect(toJsonStorable(str)).to.deep.equal({ value: { 'i18n:fr': 'FR value', 'i18n:en': 'EN value', } })
    });

    it('can parse a multiloc', () => {
        const str = { value: new MultiLoc({ fr: 'FR value', en: 'EN value' }) };
        const serial = withSerializationContext(() => JSON.stringify(str));
        const deser = jsonParseLocalized(serial);
        assert.instanceOf(deser.value, MultiLoc);
        // check translation
        addLocale('fr-FR', {});
        const translated = withLocales(['fr'], () => JSON.stringify(deser));
        expect(translated).to.equal('{"value":"FR value"}');
    });


    it('can parse a singleloc', () => {
        const str = { value: [new SingleLoc(`first`), new SingleLoc(`second`)] };
        const serial = withSerializationContext(() => JSON.stringify(str));
        const deser = jsonParseLocalized(serial);
        assert.instanceOf(deser.value, Array);
        for (const k of deser.value) {
            assert.instanceOf(k, SingleLoc);
        }
        // check translation
        addLocale('fr-FR', {});
        const translated = withLocales(['fr'], () => JSON.stringify(deser));
        expect(translated).to.equal('{"value":["first","second"]}');
    })
});