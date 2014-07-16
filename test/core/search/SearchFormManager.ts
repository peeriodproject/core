/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import PluginManager = require('../../../src/core/plugin/PluginManager');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');
import SearchFormManager = require('../../../src/core/search/SearchFormManager');
import JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchFormManager @joern', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var pluginManagerStub:any;
	var pluginRunnerStub:any;
	var stateHandlerFactoryStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				if (key === 'app.dataPath') {
					return testUtils.getFixturePath('PATH/HERE');
				}
				else if (key === 'search.searchFormStateConfig') {
					return 'searchFormManager.json';
				}
			}
		});
		pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager);
		pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner);
		stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory);
	});

	afterEach(function () {
		sandbox.restore();

		pluginManagerStub = null;
		pluginRunnerStub = null;
		stateHandlerFactoryStub = null;
	});

	it ('should correctly instantiate SearchFormManager without error', function () {
		(new SearchFormManager(configStub, stateHandlerFactoryStub, pluginManagerStub)).should.be.an.instanceof(SearchFormManager);
	});

});