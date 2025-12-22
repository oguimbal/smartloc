import { describe, it, expect, beforeEach } from 'bun:test';
import { loc, setDefaultLocale, addLocale, withLocales, clearLocales, toJsonStorable, SingleLoc, MultiLoc, jsonParseLocalized, toLocalizable } from '../src';
import { withSerializationContext, SmartLoc } from '../src/core/smartloc';


describe('Json serialization', () => {

    beforeEach(() => {
        clearLocales();
        setDefaultLocale('en-US');
    })

    it('toJsonStorable() handles singleloc values', () => {
        const str = new SingleLoc(`a translation`);
        expect(toJsonStorable(str)).toEqual('i18n/single:a translation')
    });

    it('toJsonStorable() handles singleloc props', () => {
        const str = { value: new SingleLoc(`a translation`) };
        expect(toJsonStorable(str)).toEqual({ value: 'i18n/single:a translation' })
    });


    it('toJsonStorable() handles singleloc arrays', () => {
        const str = { value: [new SingleLoc(`first`), new SingleLoc(`second`)] };
        expect(toJsonStorable(str)).toEqual({ value: ['i18n/single:first', 'i18n/single:second'] })
    });


    it('toJsonStorable() handles multiloc', () => {
        const str = { value: new MultiLoc({ fr: 'FR value', en: 'EN value' }) };
        expect(toJsonStorable(str)).toEqual({ value: { 'i18n:fr': 'FR value', 'i18n:en': 'EN value', } })
    });


    it('toJsonStorable() handles smartloc with translate option to "id"', () => {
        const str = { value: loc('something')`Something` };
        const received = toJsonStorable(str, { nonSelfDescriptive: 'id' });
        expect(received).toEqual({ value: 'i18n/id:something' })
    });

    it('toJsonStorable() handles smartloc with countable translate', () => {
        const str = { value: loc.plural(42)('something')`Something ${42}` };
        expect(toJsonStorable(str, { nonSelfDescriptive: 'id' })).toEqual({ value: {
            i18n: 'something',
            data: [42],
            count: 42
        } })
    });


    it('toJsonStorable() handles smartloc with inclusions', () => {
        const str = { value: loc('something')`Answer: ${42} with ${'str'}` };
        expect(toJsonStorable(str, { nonSelfDescriptive: 'id' })).toEqual({
            value: {
                i18n: 'something',
                data: [42, 'str']
            }
        })
    });

    it('toJsonStorable() handles smartloc with translate option to "toMulti"', () => {
        const str = { value: loc('something')`Something` };
        addLocale('fr', { something: 'Quelque chose' })
        expect(toJsonStorable(str, { nonSelfDescriptive: 'toMulti' })).toEqual({ value: { 'i18n:fr': 'Quelque chose', 'i18n:en-US': 'Something', } })
    });


    it('toJsonStorable() handles smartloc with translate option to "skip/"', () => {
        const str = { value: loc('something')`Something` };
        addLocale('fr', { something: 'Quelque chose' })
        const got = toJsonStorable(str, { nonSelfDescriptive: 'skip' });
        expect(got).toEqual(str);
    });

    it('can parse a multiloc', () => {
        const str = { value: new MultiLoc({ fr: 'FR value', en: 'EN value' }) };
        const serial = withSerializationContext(() => JSON.stringify(str));
        const deser = jsonParseLocalized(serial);
        expect(deser.value).toBeInstanceOf(MultiLoc);
        // check translation
        addLocale('fr-FR', {});
        const translated = withLocales(['fr'], () => JSON.stringify(deser));
        expect(translated).toEqual('{"value":"FR value"}');
    });


    it('can parse a singleloc', () => {
        const str = { value: [new SingleLoc(`first`), new SingleLoc(`second`)] };
        const serial = withSerializationContext(() => JSON.stringify(str));
        const deser = jsonParseLocalized(serial);
        expect(deser.value).toBeInstanceOf(Array);
        for (const k of deser.value) {
            expect(k).toBeInstanceOf(SingleLoc);
        }
        // check translation
        addLocale('fr-FR', {});
        const translated = withLocales(['fr'], () => JSON.stringify(deser));
        expect(translated).toEqual('{"value":["first","second"]}');
    })


    it('can parse a smartloc', () => {
        // must be registered to deserialize ids
        addLocale('fr', { something: 'Quelque chose' });
        addLocale('en-US', { something: 'Something' });

        const str = { value: [loc('something')`Something`] };
        const serial = withSerializationContext(() => JSON.stringify(str));
        const deser = jsonParseLocalized(serial);
        expect(deser.value).toBeInstanceOf(Array);
        for (const k of deser.value) {
            expect(k).toBeInstanceOf(SmartLoc);
        }
        // check translation
        let translated = withLocales(['fr'], () => JSON.stringify(deser));
        expect(translated).toEqual('{"value":["Quelque chose"]}');
        translated = withLocales(['en'], () => JSON.stringify(deser));
        expect(translated).toEqual('{"value":["Something"]}');
    })


    it('can parse a smartloc with arguments', () => {
        // must be registered to deserialize ids
        addLocale('fr', { something: 'Quelque chose {0} {1}' });
        addLocale('en-US', { something: 'Something {0} {1}' });

        const str = { value: [loc('something')`Something ${'str'} ${42}`] };
        const serial = withSerializationContext(() => JSON.stringify(str));
        const deser = jsonParseLocalized(serial);
        expect(deser.value).toBeInstanceOf(Array);
        for (const k of deser.value) {
            expect(k).toBeInstanceOf(SmartLoc);
        }
        // check translation
        let translated = withLocales(['fr'], () => JSON.stringify(deser));
        expect(translated).toEqual('{"value":["Quelque chose str 42"]}');
        translated = withLocales(['en'], () => JSON.stringify(deser));
        expect(translated).toEqual('{"value":["Something str 42"]}');
    });


    it('should return the same object instance if no smartloc instance', async () => {
        const obj = {
            a: { b: [42, { c: 51 }] }
        };
        const ret = toJsonStorable(obj);
        expect(obj === ret).toBe(true);
        const deser = toLocalizable(ret);
        expect(obj === deser).toBe(true);
    });

    it('should return other instance if no smartloc instance', async () => {
        const obj = {
            a: { b: [42, { c: loc`Whatever` }] }
        };
        const ret = toJsonStorable(obj);
        expect(obj === ret).toBe(false);
        const deser = toLocalizable(ret);
        expect(ret === deser).toBe(false);
    });
});