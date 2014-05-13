/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchStore = require('../../../src/core/search/SearchStore');

describe('CORE --> SEARCH --> SearchStore @joern', function () {
	var sandbox:SinonSandbox;
	var config:any;

	this.timeout(0);

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key):any {
				if (key === 'search.host') {
					return 'localhost';
				}
				else if (key === 'search.port') {
					return 9200;
				}
				else if (key === 'search.binaryPath') {
					return 'core/search/elasticsearch-1.1.1'
				}
			}
		});
	});

	afterEach(function () {
		sandbox.restore();
		config = null;
	});

	it ('should correctly instantiate the search store', function (done) {
		(new SearchStore(config, {
			onOpenCallback: function () {
				done();
			}
		})).should.be.an.instanceof(SearchStore);
	});

});