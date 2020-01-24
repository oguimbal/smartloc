import express from 'express';
import {setDefaultLocale, addLocale, loc} from '../../src';
import translator from '../../src/express';
const app = express()
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

// use the translator midlleware
app.use(translator());

// Try browsing http://localhost:3000/
app.get('/', (req, res) => {
    res.json({
        answer: loc('hello')`Salve mundi !`,
    });
});

// Try browsing http://localhost:3000/something
app.get('/:arg', (req, res) => {
    res.send(loc('arg')`Hic es ${req.params.arg}`)
});

app.listen(port, () => console.log(`Localized app listening on port ${port}!
Try visiting http://localhost:3000/  or http://localhost:3000/somewhere`))