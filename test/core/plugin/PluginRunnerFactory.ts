/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');

describe('CORE --> PLUGIN --> PluginRunnerFactory', function () {
	var sandbox:SinonSandbox;
	var configStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'plugin.api.basePath') {
					return 'src/core/plugin/api';
				}
				else if (key === 'plugin.api.pluginApiName') {
					return 'PluginApi.js';
				}
				else if (key === 'plugin.binaryPath') {
					return './core/plugin/pluginRunner/node_v0_10_31';
				}
			}
		});
	});

	afterEach(function () {
		sandbox.restore();
	});

	it ('should correctly create plugin runners', function () {
		var pluginRunner = (new PluginRunnerFactory()).create(configStub, 'identifier', testUtils.getFixturePath('core/plugin/pluginRunner/emptyFile.js'));
		pluginRunner.should.be.an.instanceof(PluginRunner);
		pluginRunner.cleanup();
	});

});