/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var SearchMessageBridge = require('../../../src/core/search/SearchMessageBridge');
var SearchRequestManager = require('../../../src/core/search/SearchRequestManager');
var SearchResponseManager = require('../../../src/core/search/SearchResponseManager');

describe('CORE --> SEARCH --> SearchMessageBridge @joern', function () {
    var sandbox;
    var searchRequestManagerStub;
    var searchResponseManagerStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager);
        searchResponseManagerStub = testUtils.stubPublicApi(sandbox, SearchResponseManager);
    });

    afterEach(function () {
        sandbox.restore();

        searchRequestManagerStub = null;
        searchResponseManagerStub = null;
    });

    it('should correctly instantiate the SearchMessageBridge', function () {
        (new SearchMessageBridge(searchRequestManagerStub, searchResponseManagerStub)).should.be.an.instanceof(SearchMessageBridge);
    });

    it('should correctly deflate a outgoing query and trigger the `EVENT_NAME` event', function () {
    });

    it('should correctly inflate a incoming Response and forward it to the SearchRequestManager', function () {
    });
});
//# sourceMappingURL=SearchMessageBridge.js.map
