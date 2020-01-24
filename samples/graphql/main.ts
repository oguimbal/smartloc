import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {localizeSchema, localizedContext, GLocString} from 'smartloc/graphql';
import { setDefaultLocale, addLocale, loc } from 'smartloc';
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import GJson from 'graphql-type-json';
const app = express();
const port = 3000;

// lets say our developpers use latin to write original strings in code
setDefaultLocale('la');

// add translations for actual languages...
addLocale('fr-FR', {
    hello: 'Bonjour tout le monde !',
    arg: 'Vous êtes ici: {0}',
});

addLocale('en-US', {
    hello: 'Hello world !',
    arg: 'You are here: {0}',
});


// build your schema
//  [self promotion] checkout my other library if you with to add some dependency injection in resolvers https://www.npmjs.com/package/inversify-graphql

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Root',
        fields: () => ({
            hello: {
                type: GLocString,
                description: 'A greeting string that is translatable',
                resolve: () => loc('hello')`Salve mundi !`,
            },
            location: {
                type: GJson,
                description: 'Your location, as a JSON translatable object',
                args: {
                    myArg: { type: new GraphQLNonNull(GraphQLString), }
                },
                resolve: (_, {myArg}) => ({
                    location: loc('arg')`Hic es ${myArg}`,
                }),
            },
        })
    })
});



// create our appolo endpoint
const apollo = new ApolloServer({
    schema: localizeSchema(schema),
    context: localizedContext(async http => {
        // build your own context here as usual
        return {};
    })
});
apollo.applyMiddleware({
    app,
    path: '/graphql',
});

// start listening
app.listen(port, () => console.log(`Localized graphql listening on port ${port}!
Try visiting http://localhost:3000/graphql and run the query:

{
    hello
    location(myArg: "somewhere")
}`))