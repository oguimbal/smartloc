# GraphQL (Apollo Server + Express)

```ts
import { ApolloServer } from 'apollo-server-express';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { loc, setDefaultLocale } from 'smartloc';
import { GLocString, localizeSchema, localizedContext } from 'smartloc/graphql';

setDefaultLocale('en');

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Root',
        fields: () => ({
            hello: {
                type: GLocString,                          // exposed as `LocalizedString`
                resolve: () => loc('hello')`Hello world`,
            },
        }),
    }),
});

const apollo = new ApolloServer({
    schema: localizeSchema(schema),
    context: localizedContext(async ({ req }) => ({ /* your context */ })),
});
```

Three pieces:

- **`GLocString`**: a `LocalizedString` scalar. Resolvers return any `LocStr`. As an input, it accepts a plain string (`singleLoc`) or `{ "en": "...", "fr": "..." }` (`multiLoc`).
- **`localizeSchema(schema)`**: patches resolvers of `LocalizedString` fields, and of `JSON`/`JSONObject` scalar fields, so their result is translated. Call it once on your built schema.
- **`localizedContext(fn)`**: wraps your context factory and reads `Accept-Language` from the request. If you build the context yourself, tag it with `localizedContextObject(ctx, ['fr', 'en'])` instead.

`JSON` fields are translated recursively, so an object containing `loc` strings can be returned as-is.

Full runnable example: [samples/graphql/main.ts](../samples/graphql/main.ts).
