/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import SearchManagerInterface = require('../../../src/core/search/interfaces/SearchManagerInterface');

import PluginManager = require('../../../src/core/plugin/PluginManager');
import SearchClient = require('../../../src/core/search/SearchClient');
import SearchManager = require('../../../src/core/search/SearchManager');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchManager @joern', function () {
	var sandbox:SinonSandbox;
	var createConfig:any = function ():any {
		return testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				if (key === 'pluginManagerStateConfig') {
					return 'pluginManager.json';
				}
			}
		});
	};
	var closeAndDone = function (searchManager, done) {
		searchManager.close(function () {
			done();
		});
	};

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
	});

	afterEach(function () {
		sandbox.restore();
	});

	it ('should correctly instantiate SearchManager without error', function (done) {
		var configStub = createConfig();
		var  pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager);
		var searchClientStub =  testUtils.stubPublicApi(sandbox, SearchClient);

		var searchManager:SearchManagerInterface = new SearchManager(configStub, pluginManagerStub, searchClientStub);
		searchManager.should.be.an.instanceof(SearchManager);

		closeAndDone(searchManager, done);
	});

});