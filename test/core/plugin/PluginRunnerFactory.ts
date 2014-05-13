/// <reference path='../../test.d.ts' />

require('should');
import testUtils = require('../../utils/testUtils');

import PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');

describe('CORE --> PLUGIN --> PluginRunnerFactory @joern', function () {

	it ('should correctly create plugin runners', function () {
		var pluginRunner = (new PluginRunnerFactory()).create('identifier', testUtils.getFixturePath('/plugin/pluginRunner/emptyFile.js'));
		pluginRunner.should.be.an.instanceof(PluginRunner);
	});

});