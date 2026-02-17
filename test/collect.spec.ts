import { describe, it, expect } from 'bun:test';
import { collectFromSource, Loc, makeSimpleTagParser } from '../src/cli/collect';
import { autoGenerateId } from '../src/core/utils';

describe('Collection', () => {
    function col(content: string) {
        const all: Loc[] = [];
        const ids = new Map();
        collectFromSource(content, ids, all);
        return all.map(x => {
            const ret: { id: string; val: string; plural?: boolean } = {
                id: x.id,
                val: x.source,
            };
            if (x.plural) {
                ret.plural = x.plural;
            }
            return ret;
        });
    }

    it('collect with id', () => {
        const all = col('blah`` loc("myId") `String ${with} some ${params}`');
        expect(all).toEqual([
            { id: 'myId', val: 'String {0} some {1}' }
        ])
    });


    it('collect without id', () => {
        const all = col('blah`` loc `String ${with} some ${params}`');
        const id = autoGenerateId(['String ', ' some ', '']);
        expect(all).toEqual([
            { id, val: 'String {0} some {1}' }
        ])
    });

    it('collects plural', () => {
        const all = col('blah`` loc.plural(42) `String ${with} some ${params}`');
        const id = autoGenerateId(['String ', ' some ', '']);
        expect(all).toEqual([
            { id, val: 'String {0} some {1}', plural: true }
        ])
    });
});


describe('Simple tag parser', () => {
    it('parses simple tag', () => {
        const parser = makeSimpleTagParser('Named<*>');
        expect(Array.from(parser('Named<"some string">'))).toEqual(['some string']);
        expect(Array.from(parser('Named<"some string"> Named<"another string">'))).toEqual(['some string', 'another string']);
        // with backticks
        expect(Array.from(parser('Named<`some string`> Named<`another string`>'))).toEqual(['some string', 'another string']);
        // with quotes
        expect(Array.from(parser('Named<"some string"> Named<"another string">'))).toEqual(['some string', 'another string']);
        // with backticks
        expect(Array.from(parser('Named<`some string`> Named<`another string`>'))).toEqual(['some string', 'another string']);
        // with quotes and backticks
        expect(Array.from(parser('Named<"some string"> Named<`another string`>'))).toEqual(['some string', 'another string']);
        // with backticks and quotes
        expect(Array.from(parser('Named<`some string`> Named<"another string">'))).toEqual(['some string', 'another string']);
    });
});