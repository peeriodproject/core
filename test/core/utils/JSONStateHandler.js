/// <reference path='../../test.d.ts' />
require('should');

var testUtils = require('../../utils/testUtils');

var JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');

describe('CORE --> UTILS --> JSONStateHandler', function () {
    var validStatePath = testUtils.getFixturePath('core/utils/JSONStateHandler/state.json');
    var invalidStatePath = testUtils.getFixturePath('core/utils/JSONStateHandler/invalidState.json');
    var invalidJSONPath = testUtils.getFixturePath('core/utils/JSONStateHandler/invalidJsonState.json');
    var writableStateFolder = testUtils.getFixturePath('core/utils/JSONStateHandler/save');

    it('should correctly instantiate JSONStateHandler', function () {
        var stateHandler = new JSONStateHandler(validStatePath);

        stateHandler.should.be.an.instanceof(JSONStateHandler);
    });

    it('shouls correctly load the state', function (done) {
        var stateHandler = new JSONStateHandler(validStatePath);

        stateHandler.load(function (err, state) {
            var fileState = {
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

    it('should correctly return an error if the path is invalid', function (done) {
        var stateHandler = new JSONStateHandler(invalidStatePath);

        stateHandler.load(function (err, state) {
            err.should.be.an.instanceof(Error);
            err.message.should.equal('JSONStateHandler.load: Cannot find state file: "' + invalidStatePath + '"');
            (state === null).should.be.true;

            done();
        });
    });

    it('should correctly return an error if the file contains invalid JSON', function (done) {
        var stateHandler = new JSONStateHandler(invalidJSONPath);

        stateHandler.load(function (err, state) {
            err.should.be.an.instanceof(Error);
            err.message.should.equal('JSONStateHandler.load: The file "' + invalidJSONPath + '" is not a valid JSON-File.');
            (state === null).should.be.true;

            done();
        });
    });

    describe('should correclty save the state to the specified path.', function () {
        before(function () {
            testUtils.deleteFolderRecursive(writableStateFolder);
        });

        it('should correctly write the state to disk and create missing folders if nessessary.', function (done) {
            var stateHandler = new JSONStateHandler(writableStateFolder + '/state.json');

            var stateObject = {
                foo: "bar"
            };

            stateHandler.save(stateObject, function (err) {
                (err === null).should.be.true;

                stateHandler.load(function (err, state) {
                    (err === null).should.be.true;

                    state.should.containDeep(stateObject);

                    done();
                });
            });
        });

        it('should correctly override the state file', function (done) {
            var stateHandler = new JSONStateHandler(writableStateFolder + '/state.json');

            var stateObject = {
                foo: "foofoo"
            };

            stateHandler.save(stateObject, function (err) {
                (err === null).should.be.true;

                stateHandler.load(function (err, state) {
                    (err === null).should.be.true;

                    state.should.containDeep(stateObject);

                    done();
                });
            });
        });
    });
});
//# sourceMappingURL=JSONStateHandler.js.map
