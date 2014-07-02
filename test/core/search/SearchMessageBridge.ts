/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import SearchMessageBridge = require('../../../src/core/search/SearchMessageBridge');
import SearchRequestManager = require('../../../src/core/search/SearchRequestManager');
import SearchResponseManager = require('../../../src/core/search/SearchResponseManager');

describe('CORE --> SEARCH --> SearchMessageBridge @joern', function () {
	var sandbox:SinonSandbox;
	var searchRequestManagerStub:any;
	var searchResponseManagerStub:any;

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

	it ('should correctly instantiate the SearchMessageBridge', function () {
		(new SearchMessageBridge(searchRequestManagerStub, searchResponseManagerStub)).should.be.an.instanceof(SearchMessageBridge);
	});

	it ('should correctly deflate a outgoing query and trigger the `EVENT_NAME` event', function () {

	});

	it ('should correctly inflate a incoming Response and forward it to the SearchRequestManager', function () {

	});

});