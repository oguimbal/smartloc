import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { GraphQLScalarType, GraphQLList, GraphQLUnionType, GraphQLInterfaceType, GraphQLField, GraphQLNonNull, } from 'graphql';
import express from 'express';
import { isLocStr } from '.';
import parser from 'accept-language-parser';
import { withLocales, MultiLoc, SingleLoc } from './core/smartloc';
import { translateInContext } from './core/json-utils';
import { Kind } from 'graphql/language';

const INVALID_MSG = `Invalid localizable string input. Expecting either a string in the default locale, or an object like {"en": "English translation", "fr": "Traduction française"}`;
function parseValue(value: any) {
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

function parseObject(ast: any, variables: any) {
    const value = Object.create(null);
    let hasValue = false;
    ast.fields.forEach((field: any) => {
        let val: string;
        switch (field.value.kind) {
            case Kind.STRING:
                val = field.value.value;
                break;
            case Kind.VARIABLE: {
                val = variables?.[field.value.name.value];
                break;
            }
            default:
                throw new TypeError(INVALID_MSG);
        }
        if (val === null || val === undefined) {
            return;
        }
        if (typeof val !== 'string') {
            throw new TypeError(INVALID_MSG);
        }
        hasValue = true;
        value[field.name.value] = val;
    });
    if (!hasValue) {
        return null;
    }
    return new MultiLoc(value);
}

function parseLiteral(ast: any, variables: any) {
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
            let ft = (field as any).type;
            if (!ft) {
                continue;
            }

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
            }
            if (ft instanceof GraphQLInterfaceType) {
                for (const t of schema.getPossibleTypes(ft)) {
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

    patchObject(schema.getQueryType() as GraphQLObjectType);
    patchObject(schema.getMutationType() as GraphQLObjectType);
    return schema;
}

function patchField(id: string, field: GraphQLField<any, any>) {
    if ((field.resolve as any)?.[patchedTag]) {
        return;
    }
    const or = field.resolve;
    field.resolve = async function (source, args, ctx, info) {
        const value = or
            ? await or.apply(this, [source, args, ctx, info])
            : source?.[id];
        const locales = ctx && typeof ctx === 'object'
            ? ctx?.[localeTag]
            : null;
        return withLocales(locales, () => translateInContext(value));
    };
    (field.resolve as any)[patchedTag] = true;
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

export function localizedContextObject<T>(ctx: T, locales: string[]): T {
    if (!ctx || typeof ctx !== 'object') {
        return ctx;
    }
    (ctx as any)[localeTag] = locales;
    return ctx;
}

function patchContextObj(req: express.Request, ctx: any) {
    if (!ctx || typeof ctx !== 'object') {
        return ctx;
    }
    if (ctx[localeTag]) {
        return ctx;
    }
    const lh = req?.headers?.['accept-language'];
    if (!lh) {
        return ctx;
    }
    ctx[localeTag] = parser.parse(lh)
        ?.map(x => x.region ? `${x.code}-${x.region}` : x.code);
    return ctx;
}