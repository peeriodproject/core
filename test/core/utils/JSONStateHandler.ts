/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');

describe('CORE --> UTILS --> JSONStateHandler', function () {
	var validStatePath:string = testUtils.getFixturePath('core/utils/JSONStateHandler/state.json');
	var invalidStatePath:string = testUtils.getFixturePath('core/utils/JSONStateHandler/invalidState.json');
	var invalidJSONPath:string = testUtils.getFixturePath('core/utils/JSONStateHandler/invalidJsonState.json');
	var writableStateFolder:string = testUtils.getFixturePath('core/utils/JSONStateHandler/save');

	it ('should correctly instantiate JSONStateHandler', function () {
		var stateHandler:JSONStateHandler = new JSONStateHandler(validStatePath);

		stateHandler.should.be.an.instanceof(JSONStateHandler);
	});

	it ('shouls correctly load the state', function (done) {
		var stateHandler:JSONStateHandler = new JSONStateHandler(validStatePath);

		stateHandler.load(function (err:Error, state:Object) {
			var fileState:Object = {
				a: {
					valid: {
						json: {
							document: true
						}
					}
				}
			};

			(err === null).should.be.true;
			state.should.containDeep(fileState);

			done();
		});
	});

	it ('should correctly return an error if the path is invalid', function (done) {
		var stateHandler:JSONStateHandler = new JSONStateHandler(invalidStatePath);

		stateHandler.load(function (err:Error, state:Object) {
			err.should.be.an.instanceof(Error);
			err.message.should.equal('JSONStateHandler.load: Cannot find state file: "' + invalidStatePath + '"');
			(state === null).should.be.true;

			done();
		});
	});

	it ('should correctly return an error if the file contains invalid JSON', function (done) {
		var stateHandler:JSONStateHandler = new JSONStateHandler(invalidJSONPath);

		stateHandler.load(function (err:Error, state:Object) {
			err.should.be.an.instanceof(Error);
			err.message.should.equal('JSONStateHandler.load: The file "' + invalidJSONPath + '" is not a valid JSON-File.');
			(state === null).should.be.true;

			done();
		});
	});

	describe ('should correclty save the state to the specified path.', function () {

		before(function () {
			testUtils.deleteFolderRecursive(writableStateFolder);
		});

		it ('should correctly write the state to disk and create missing folders if nessessary.', function (done) {
			var stateHandler:JSONStateHandler = new JSONStateHandler(writableStateFolder + '/state.json');

			var stateObject = {
				foo: "bar"
			};

			stateHandler.save(stateObject, function (err:Error) {
				(err === null).should.be.true;

				stateHandler.load(function (err:Error, state:Object) {
					(err === null).should.be.true;

					state.should.containDeep(stateObject);

					done();
				});
			});
		});

		it ('should correctly override the state file', function (done) {
			var stateHandler:JSONStateHandler = new JSONStateHandler(writableStateFolder + '/state.json');

			var stateObject = {
				foo: "foofoo"
			};

			stateHandler.save(stateObject, function (err:Error) {
				(err === null).should.be.true;

				stateHandler.load(function (err:Error, state:Object) {
					(err === null).should.be.true;

					state.should.containDeep(stateObject);

					done();
				});
			});
		});
	});

});