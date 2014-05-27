/// <reference path='../../test.d.ts' />
require('should');

var SearchItemFactory = require('../../../src/core/search/SearchItemFactory');
var SearchItem = require('../../../src/core/search/SearchItem');

describe('CORE --> SEARCH --> SearchItemFactory', function () {
    it('should correctly create plugin loaders', function () {
        var data = '[{"_index":"mainindex","_type":"pluginidentifier","_id":"DzEnMrJGROujWKZUC5hZNg","_score":0.5254995,"_source":{"itemHash":"fileHash","itemPath":"../path/file.txt","itemStats":{"stats":true},"foo":"bar"}},{"_index":"mainindex","_type":"pluginidentifier2","_id":"LBcCuWQlRNObplgP4S5KGw","_score":0.5254995,"_source":{"itemHash":"fileHash","itemPath":"../path/file.txt","itemStats":{"stats":true},"foo":"bar"}}]';

        var searchItem = (new SearchItemFactory()).create(JSON.parse(data));
        searchItem.should.be.an.instanceof(SearchItem);
    });
});
//# sourceMappingURL=SearchItemFactory.js.map
