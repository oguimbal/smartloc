export { changeLocale, addLocale, clearLocales, removeLocale, setDefaultLocale, getDefaultLocale } from './core/locale-list';
export { loc } from './core/tag';
export { withLocales, singleLoc, multiLoc, joinArray, withSerializationContext, useAsString } from './core/smartloc';
export { isLocStr } from './core/literal';
export type { LocStr, TranslationOf, StorableOf } from './core/interfaces';
export { translateInContext, jsonParseLocalized, toJsonStorable, translateObject, toLocalizable } from './core/json-utils';
export { loadJsonLocale } from './core/load';
