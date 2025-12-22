import { describe, it, expect, beforeEach } from 'bun:test';
import {loc, setDefaultLocale, addLocale, withLocales, clearLocales} from '../src';


describe('Translation', () => {

    beforeEach(() => {
        clearLocales();
        setDefaultLocale('en-US');
    })

    it ('uses default when no context', () => {
        expect(loc('def')`this uses ${'en'} as default`.toString())
            .toEqual('this uses en as default');
    });


    it ('translates in context', () => {
        addLocale('fr-FR', {
            'def': 'la langue par défaut est "{0}"',
        });
        const translated = withLocales(['fr-FR'], () => {
            return loc('def')`this uses ${'en'} as default`.toString()
        });
        expect(translated).toEqual('la langue par défaut est "en"');
    });


    it ('fallsback on second language when main misses a translation key', () => {
        addLocale('gb', {});
        addLocale('fr-FR', {
            'def': 'la langue par défaut est "{0}"',
        });
        const translated = withLocales(['gb', 'fr-FR'], () => {
            return loc('def')`this uses ${'en'} as default`.toString()
        });
        expect(translated).toEqual('la langue par défaut est "en"');
    });


    it ('fallsback on default language when no key', () => {
        addLocale('gb', {});
        addLocale('fr-FR', {});
        const translated = withLocales(['gb', 'fr-FR'], () => {
            return loc('def')`this uses ${'en'} as default`.toString()
        })
        expect(translated).toEqual('this uses en as default');
    });


    it ('supports auto ids', () => {
        addLocale('fr-FR', {
            // this is the sha1 of 'Bonjour'
            'sha1.f7ff9e8b7bb2e09b70935a5d785e0cc5d9d0abf0': 'Bonjour',
        });
        const translated = withLocales(['fr-FR'], () => {
            return loc`Hello`.toString()
        })
        expect(translated).toEqual('Bonjour');
    });
});