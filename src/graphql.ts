import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { GraphQLScalarType, GraphQLList, GraphQLUnionType, GraphQLField, GraphQLNonNull } from 'graphql/type/definition';
import express from 'express';
import { isLocStr } from '.';
import parser from 'accept-language-parser';
import { withLocales, MultiLoc, SingleLoc } from './core/smartloc';
import moment from 'moment';
import { translateInContext } from './core/json-utils';
import { getDefaultLocale } from './core/locale-list';
import { Kind } from 'graphql/language';

const INVALID_MSG = `Invalid localizable string input. Expecting either a string in the default locale, or an object like {"en": "English translation", "fr": "Traduction française"}`;
function parseValue(value) {
    if (!value) {
        return null;
    }
    if (typeof value === 'string') {
        return new SingleLoc(value);
    }
    if (typeof value === 'object') {
        for (const v of Object.values(value)) {
            if (typeof v !== 'string') {
                throw new TypeError(INVALID_MSG);
            }
        }
        return new MultiLoc(value);
    }
    throw new TypeError(INVALID_MSG);
}

function parseObject(ast, variables) {
    const value = Object.create(null);
    ast.fields.forEach(field => {
        switch (field.value.kind) {
            case Kind.STRING:
                value[field.name.value] = ast.value.value;
                break;
            case Kind.VARIABLE: {
                const name = ast.name.value;
                const val = variables ? variables[name] : undefined;
                if (typeof val !== 'string' || !val) {
                    throw new TypeError(INVALID_MSG);
                }
                break;
            }
            default:
                throw new TypeError(INVALID_MSG);
        }
    });
    return value;
}

function parseLiteral(ast, variables) {
    switch (ast.kind) {
        case Kind.STRING:
            return new SingleLoc(ast.value);
        case Kind.OBJECT:
            return parseObject(ast, variables);
        case Kind.NULL:
            return null;
        case Kind.VARIABLE: {
            const name = ast.name.value;
            return variables ? parseValue(variables[name]) : undefined;
        }
        default:
            throw new TypeError(`Invalid localizable string input (${ast.kind}). Expecting either a string in the default locale, or an object like {"en": "English translation", "fr": "Traduction française"}`);
    }
}

const localeTag = Symbol('_smartloc_locale');
export const GLocString = new GraphQLScalarType({
    name: 'LocalizedString',
    description: 'A string which value depends on Accept-Language request headers.',
    serialize(value) {
        if (isLocStr(value)) {
            throw new TypeError(`You must apply the localizeSchema() patch to fix your schema when using LocalizedString`);
        }

        if (value === null || value === undefined || typeof value === 'string') {
            return value;
        }

        throw new TypeError(`Graphql field of type LocalizedString expecting a localizable string`);
    },
    parseValue,
    parseLiteral,
});


const patchedTag = Symbol('_smartloc_patched');
export function localizeSchema(schema: GraphQLSchema) {
    const qt = schema.getQueryType();
    const patched = new Set();
    function patchObject(type: GraphQLObjectType) {
        if (!(type instanceof GraphQLObjectType)) {
            return;
        }
        const fields = type.getFields();
        if (patched.has(type)) {
            return;
        }
        patched.add(type);
        for (const [id, field] of Object.entries(fields)) {
            if (!field.type) {
                continue;
            }


            let ft = field.type;
            while (true) {
                if (ft instanceof GraphQLList || ft instanceof GraphQLNonNull) {
                    ft = ft.ofType;
                } else {
                    break;
                }
            }

            if (ft instanceof GraphQLUnionType) {
                for (const t of ft.getTypes()) {
                    patchObject(t);
                }
            } else if (ft instanceof GraphQLObjectType) {
                patchObject(ft);
            } else if (ft === GLocString) {
                patchField(id, field);
            } else if (ft instanceof GraphQLScalarType && (ft.name === 'JSON' || ft.name === 'JSONObject')) {
                patchField(id, field);
            }
        }
    }

    patchObject(qt);
    return schema;
}

function patchField(id: string, field: GraphQLField<any, any>) {
    if (field.resolve?.[patchedTag]) {
        return;
    }
    const or = field.resolve;
    field.resolve = async function (source, args, ctx, info) {
        const value = or
            ? await or.apply(this, [source, args, ctx, info])
            : source?.[id];
        const locales = value && typeof value === 'object'
            ? ctx?.[localeTag]
            : null;
        return withLocales(locales, () => translateInContext(value));
    };
    field.resolve[patchedTag] = true;
}



export interface ExpressContext {
    req: express.Request;
    res: express.Response;
}
export type Context<T = object> = T;
export type ContextFunction<FunctionParams = any, ProducedContext = object> = (
    context: FunctionParams,
) => Context<ProducedContext> | Promise<Context<ProducedContext>>;

export function localizedContext(context: ContextFunction<ExpressContext, Context>): ContextFunction<ExpressContext, Context> {
    return app => {
        const ctx = context(app);
        if ('then' in ctx && typeof ctx.then === 'function') {
            return ctx.then(x => patchContextObj(app.req, x));
        }
        return patchContextObj(app.req, ctx);
    }
}

export function localizedContextObject(ctx: any, locales: string[]) {
    if (!ctx || typeof ctx !== 'object') {
        return ctx;
    }
    ctx[localeTag] = locales;
}

function patchContextObj(req: express.Request, ctx: any) {
    if (!ctx || typeof ctx !== 'object') {
        return ctx;
    }
    const lh = req.headers['accept-language'];
    if (!lh) {
        return ctx;
    }
    ctx[localeTag] = parser.parse(lh)
        ?.map(x => x.region ? `${x.code}-${x.region}` : x.code);
    return ctx;
}