/// <reference path='../../test.d.ts' />

require('should');

import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');

describe('CORE --> PLUGIN --> PluginRunnerFactory', function () {
	var sandbox:SinonSandbox;
	var configStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
	});

	afterEach(function () {
		sandbox.restore();
	});

	/*
	it ('should correctly create plugin runners', function () {
		var pluginRunner = (new PluginRunnerFactory()).create('identifier', testUtils.getFixturePath('core/plugin/pluginRunner/emptyFile.js'));
		pluginRunner.should.be.an.instanceof(PluginRunner);
	});*/

});