/// <reference path='../../test.d.ts' />
require('should');

var JSONConfig = require('../../../src/core/config/JSONConfig');

describe('CORE --> CONFIG --> JSONConfig', function () {
    describe('should successfully instantiate and throw an error if the config file was not found or is not a valid json-file.', function () {
        var validJSONPath = '../../../test/fixtures/core/config/valid.json', invalidJSONPath = '../../../test/fixtures/core/config/invalid.json', notFoundPath = '../Shep/Schwab/shopped/at/Scott\'s/Schnapps/shop';

        it('should correctly instantiate', function () {
            (new JSONConfig(validJSONPath)).should.be.an.instanceof(JSONConfig);
        });

        it('should throw a "not a valid json file" error', function () {
            (function () {
                new JSONConfig(invalidJSONPath);
            }).should.throw('JSONConfig.constructor: The file "' + invalidJSONPath + '" is not a valid JSON-File.');
        });

        it('should correctly throw a "file not found" error', function () {
            (function () {
                new JSONConfig(notFoundPath);
            }).should.throw('JSONConfig.constructor: Cannot find config file: "' + notFoundPath + '"');
        });
    });
});
//# sourceMappingURL=JSONConfig.js.map
