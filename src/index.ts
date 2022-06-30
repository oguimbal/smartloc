export { addLocale, clearLocales, removeLocale, setDefaultLocale, getDefaultLocale } from './core/locale-list';
export { loc } from './core/tag';
export { withLocales, SingleLoc, MultiLoc, withSerializationContext } from './core/smartloc';
export { isLocStr } from './core/literal';
export { LocStr, TranslationOf, StorableOf } from './core/interfaces';
export { translateInContext, jsonParseLocalized, toJsonStorable, translateObject, toLocalizable } from './core/json-utils';
export { LocStringArray } from './core/locstr-array';
