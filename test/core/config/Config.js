/// <reference path='../../test.d.ts' />
require('should');

var Config = require('../../../src/core/config/Config');

describe('CORE --> CONFIG --> ObjectConfig', function () {
    it('should successfully instantiate and throw an error when created without a propper configData object', function () {
        (new Config.ObjectConfig({})).should.be.a.instanceof(Config.ObjectConfig);

        (function () {
            new Config.ObjectConfig(false);
        }).should.throwError('Config.constructor: The given configData is not an object.');

        (function () {
            new Config.ObjectConfig([]);
        }).should.throwError('Config.constructor: The given configData is not an object.');
    });

    it('should return the correct value for a specified key', function () {
        var config = new Config.ObjectConfig({ foo: 'bar' });
        config.get('foo').should.equal('bar');
    });

    it('should throw an error if no value for the specified key was found.', function () {
        var config = new Config.ObjectConfig({
            foo: 'bar'
        });
        config.get.bind(config, 'foobar').should.throw('Config.get: no value for "foobar" found.');
        config.get.bind(config, undefined).should.throw('Config.get: No config key given.');
    });

    it('should return the specified alternative value if provided', function () {
        (new Config.ObjectConfig({})).get('foo', 'bar').should.equal('bar');
    });

    it('should correctly convert the object into dot-notated keys', function () {
        var config = new Config.ObjectConfig({
            foo: {
                bar: {
                    foobar: true
                }
            }
        });

        config.get('foo.bar.foobar').should.be.true;
    });

    it('should not allow to get subtrees of the object', function () {
        var config = new Config.ObjectConfig({
            foo: {
                bar: {
                    foobar: true
                }
            }
        });

        config.get.bind(config, 'foo.bar').should.throw('Config.get: no value for "foo.bar" found.');
    });

    it('should limit the store to the given ConfigKeyList', function () {
        var data = {
            foo: {
                bar: {
                    foobar: true
                },
                foo: {
                    foobar: true
                },
                other: 1
            },
            foobario: {
                one: true,
                two: false
            }
        };

        var config = new Config.ObjectConfig(data, ['foo.bar', 'foo.foo', 'foobario']);
        config.get('foo.bar.foobar').should.be.true;
        config.get('foo.foo.foobar').should.be.true;
        config.get.bind(config, 'foo.other').should.throw('Config.get: no value for "foo.other" found.');
        config.get('foobario.one').should.be.true;
        config.get('foobario.two').should.be.false;
    });
});

describe('CORE --> CONFIG --> JSONConfig', function () {
    it('should successfully instantiate and throw an error if the config file was not found or is not a valid json-file.', function () {
        var validJSONPath = '../../../test/fixtures/core/config/valid.json', invalidJSONPath = '../../../test/fixtures/core/config/invalid.json', notFoundPath = '../Shep/Schwab/shopped/at/Scott\'s/Schnapps/shop';

        // should be instantiate
        (new Config.JSONConfig(validJSONPath)).should.be.an.instanceof(Config.JSONConfig);

        // invalid/corrupt JSON-file
        (function () {
            new Config.JSONConfig(invalidJSONPath);
        }).should.throw('JSONConfig.constructor: The file "' + invalidJSONPath + '" is not a valid JSON-File.');

        // file not found
        (function () {
            new Config.JSONConfig(notFoundPath);
        }).should.throw('JSONConfig.constructor: Cannot find config file: "' + notFoundPath + '"');
    });
});
//# sourceMappingURL=Config.js.map
