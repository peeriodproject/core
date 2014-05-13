/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var SearchStore = require('../../../src/core/search/SearchStore');

describe('CORE --> SEARCH --> SearchStore @joern', function () {
    var sandbox;
    var config;

    this.timeout(0);

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'search.host') {
                    return 'localhost';
                } else if (key === 'search.port') {
                    return 9200;
                } else if (key === 'search.binaryPath') {
                    return 'core/search/elasticsearch-1.1.1';
                }
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
        config = null;
    });

    it('should correctly instantiate the search store', function (done) {
        (new SearchStore(config, {
            onOpenCallback: function () {
                console.log('DONE');
                done();
            }
        })).should.be.an.instanceof(SearchStore);
    });
});
//# sourceMappingURL=SearchStore.js.map
