import 'mocha';
import {expect, assert} from 'chai';
import {collectFromSource, Loc} from '../src/cli/collect';
import {autoGenerateId} from '../src/core/utils';

describe('Collection', () => {


    function col(content: string) {
        const all: Loc[] = [];
        const ids = new Map();
        collectFromSource(content, ids, all);
        return all.map(x => ({
            id: x.id,
            val: x.source,
        }));
    }

    it ('collect with id', () => {
        const all = col('blah`` loc("myId") `String ${with} some ${params}`');
        expect(all).to.deep.equal([
            {id: 'myId', val: 'String {0} some {1}'}
        ])
    });


    it ('collect without id', () => {
        const all = col('blah`` loc `String ${with} some ${params}`');
        const id = autoGenerateId(['String ', ' some ', '']);
        expect(all).to.deep.equal([
            {id, val: 'String {0} some {1}'}
        ])
    });
});