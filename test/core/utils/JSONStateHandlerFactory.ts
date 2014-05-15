/// <reference path='../../test.d.ts' />

require('should');
import testUtils = require('../../utils/testUtils');

import JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');
import JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');

describe('CORE --> UTILS --> JSONStateHandlerFactory', function () {

	it ('should correctly create JSONStateHandlers', function () {
		var stateHandler = (new JSONStateHandlerFactory()).create('/path/to/state.json');
		stateHandler.should.be.an.instanceof(JSONStateHandler);
	});

});