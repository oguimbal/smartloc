import 'mocha';
import { expect, assert } from 'chai';
import { loc, setDefaultLocale, addLocale, withLocales, clearLocales, toJsonStorable, SingleLoc, MultiLoc, jsonParseLocalized } from '../src';
import { withSerializationContext, SmartLoc } from '../src/core/smartloc';


describe('Json serialization', () => {

    beforeEach(() => {
        clearLocales();
        setDefaultLocale('en-US');
    })

    it('toJsonStorable() handles singleloc values', () => {
        const str = new SingleLoc(`a translation`);
        expect(toJsonStorable(str)).to.equal('i18n/single:a translation')
    });

    it('toJsonStorable() handles singleloc props', () => {
        const str = { value: new SingleLoc(`a translation`) };
        expect(toJsonStorable(str)).to.deep.equal({ value: 'i18n/single:a translation' })
    });


    it('toJsonStorable() handles singleloc arrays', () => {
        const str = { value: [new SingleLoc(`first`), new SingleLoc(`second`)] };
        expect(toJsonStorable(str)).to.deep.equal({ value: ['i18n/single:first', 'i18n/single:second'] })
    });


    it('toJsonStorable() handles multiloc', () => {
        const str = { value: new MultiLoc({ fr: 'FR value', en: 'EN value' }) };
        expect(toJsonStorable(str)).to.deep.equal({ value: { 'i18n:fr': 'FR value', 'i18n:en': 'EN value', } })
    });


    it('toJsonStorable() handles smartloc with translate option to "id"', () => {
        const str = { value: loc('something')`Something` };
        expect(toJsonStorable(str, { nonSelfDescriptive: 'id'})).to.deep.equal({ value: 'i18n/id:something' })
    });

    it('toJsonStorable() handles smartloc with translate option to "toMulti"', () => {
        const str = { value: loc('something')`Something` };
        addLocale('fr', {something: 'Quelque chose'})
        expect(toJsonStorable(str, { nonSelfDescriptive: 'toMulti'})).to.deep.equal({ value: { 'i18n:fr': 'Quelque chose', 'i18n:en-US': 'Something', } })
    });


    it('toJsonStorable() handles smartloc with translate option to "skip/"', () => {
        const str = { value: loc('something')`Something` };
        addLocale('fr', {something: 'Quelque chose'})
        expect(toJsonStorable(str, { nonSelfDescriptive: 'skip'})).to.deep.equal({ value: loc('something')`Something` })
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


    it('can parse a smartloc', () => {
        // must be registered to deserialize ids
        addLocale('fr', {something: 'Quelque chose'});
        addLocale('en-US', {something: 'Something'});

        const str = { value: [loc('something')`Something`] };
        const serial = withSerializationContext(() => JSON.stringify(str));
        const deser = jsonParseLocalized(serial);
        assert.instanceOf(deser.value, Array);
        for (const k of deser.value) {
            assert.instanceOf(k, SmartLoc);
        }
        // check translation
        let translated = withLocales(['fr'], () => JSON.stringify(deser));
        expect(translated).to.equal('{"value":["Quelque chose"]}');
        translated = withLocales(['en'], () => JSON.stringify(deser));
        expect(translated).to.equal('{"value":["Something"]}');
    })
});