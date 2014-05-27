/// <reference path='../../test.d.ts' />
require('should');

var SearchItem = require('../../../src/core/search/SearchItem');

describe('CORE --> SEARCH --> SearchItem', function () {
    var data = '[{"_index":"mainindex","_type":"pluginidentifier","_id":"DzEnMrJGROujWKZUC5hZNg","_score":0.5254995,"_source":{"itemHash":"fileHash","itemPath":"../path/file.txt","itemStats":{"stats":true},"foo":"bar"}},{"_index":"mainindex","_type":"pluginidentifier2","_id":"LBcCuWQlRNObplgP4S5KGw","_score":0.5254995,"_source":{"itemHash":"fileHash","itemPath":"../path/file.txt","itemStats":{"stats":true},"foo":"bar"}}]';

    it('should correctly instantiate without error', function () {
        (new SearchItem(JSON.parse(data))).should.be.an.instanceof(SearchItem);
    });

    describe('interface getter tests', function () {
        var searchItem = null;

        beforeEach(function () {
            searchItem = new SearchItem(JSON.parse(data));
        });

        afterEach(function () {
            searchItem = null;
        });

        it('should correctly return the hash', function () {
            searchItem.getHash().should.equal('fileHash');
        });

        it('should correctly return the path', function () {
            searchItem.getPath().should.equal('../path/file.txt');
        });

        it('should correctly return the plugin identifiers', function () {
            searchItem.getPluginIdentifiers().should.eql(['pluginidentifier', 'pluginidentifier2']);
        });

        it('should correctly return the plugin data', function () {
            searchItem.getPluginData('pluginidentifier').should.eql({ foo: 'bar' });
        });

        it('should correctly return the stats', function () {
            searchItem.getStats().should.eql({ stats: true });
        });

        it('should correctly return the score', function () {
            searchItem.getScore().should.equal(0.5254995);
        });
    });
});
//# sourceMappingURL=SearchItem.js.map
