import {GraphQLSchema, GraphQLObjectType} from 'graphql';
import { GraphQLScalarType, GraphQLList, GraphQLUnionType, GraphQLField, GraphQLNonNull } from 'graphql/type/definition';
import express from 'express';
import {isLocStr} from '.';
import parser from 'accept-language-parser';
import { withLocales } from './core/smartloc';
import moment from 'moment';
import { translateInContxt } from './core/json-utils';


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
    parseValue(value) {
        throw new TypeError(`Localized strings cannot be used as input types`);
    },
    parseLiteral(ast) {
        throw new TypeError(`Localized strings cannot be used as input types`);
    },
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
            if (field.type instanceof GraphQLObjectType) {
                patchObject(field.type);
                continue;
            }
            if (field.type instanceof GraphQLList) {
                if (field.type.ofType instanceof  GraphQLObjectType) {
                    patchObject(field.type.ofType);
                }
                continue;
            }
            if (field.type instanceof GraphQLUnionType) {
                for (const t of field.type.getTypes()) {
                    patchObject(t);
                }
                continue;
            }
            if (field.type instanceof GraphQLNonNull) {
                patchObject(field.type.ofType as any);
                continue;
            }
            if (field.type === GLocString) {
                patchField(id, field, v => isLocStr(v) ? v.toString() : v);
                continue;
            }
            if (field.type instanceof GraphQLScalarType && (field.type.name === 'JSON' || field.type.name === 'JSONObject')) {
                patchField(id, field, v => translateInContxt(v));
                continue;
            }
        }
    }

    patchObject(qt);
    return schema;
}

function patchField(id: string, field: GraphQLField<any, any>, transform: (v: any) => any) {
    if (field.resolve?.[patchedTag]) {
        return;
    }
    const or = field.resolve;
    field.resolve = async function(source, args, ctx, info) {
        const value = or
            ? await or.apply(this, [source, args, ctx, info])
            : source?.[id];
        const locales = value && typeof value === 'object'
            ? ctx?.[localeTag]
            : null;
        return withLocales(locales, () => transform(value));
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