/// <reference path='../../test.d.ts' />
require('should');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> CONFIG --> ObjectConfig @joern', function () {
    it('should successfully instantiate and throw an error when created without a proper configData object', function () {
        (new ObjectConfig({})).should.be.a.instanceof(ObjectConfig);

        (function () {
            new ObjectConfig(false);
        }).should.throwError('Config.constructor: The given configData is not an object.');

        (function () {
            new ObjectConfig([]);
        }).should.throwError('Config.constructor: The given configData is not an object.');
    });

    it('should return the correct value for a specified key', function () {
        var config = new ObjectConfig({ foo: 'bar' });
        config.get('foo').should.equal('bar');
    });

    it('should throw an error if no value for the specified key was found.', function () {
        var config = new ObjectConfig({
            foo: 'bar'
        });
        config.get.bind(config, 'foobar').should.throw('Config.get: No value for "foobar" found.');
        config.get.bind(config, undefined).should.throw('Config.get: No config key given.');
    });

    it('should return the specified alternative value if provided', function () {
        (new ObjectConfig({})).get('foo', 'bar').should.equal('bar');
    });

    it('should correctly convert the object into dot-notated keys', function () {
        var config = new ObjectConfig({
            foo: {
                bar: {
                    foobar: true
                }
            }
        });

        config.get('foo.bar.foobar').should.be.true;
    });

    it('should not allow to get subtrees of the object', function () {
        var config = new ObjectConfig({
            foo: {
                bar: {
                    foobar: true
                }
            }
        });

        config.get.bind(config, 'foo.bar').should.throw('Config.get: No value for "foo.bar" found.');
    });

    it('should limit the store to the given ConfigKeyList', function () {
        var data = {
            foo: {
                bar: {
                    foobar: true
                },
                foo: {
                    foobar: [1, 2, 3]
                },
                other: 1
            },
            foobario: {
                one: true,
                two: false
            }
        };

        var config = new ObjectConfig(data, ['foo.bar', 'foo.foo', 'foobario']);
        config.get('foo.bar.foobar').should.be.true;
        config.get('foo.foo.foobar').should.containDeep([1, 2, 3]);
        config.get.bind(config, 'foo.other').should.throw('Config.get: No value for "foo.other" found.');
        config.get('foobario.one').should.be.true;
        config.get('foobario.two').should.be.false;
    });

    it('should throw an error if an array contains non primitives @joern', function () {
        (function () {
            new ObjectConfig({
                foo: [
                    {
                        name: 'bar'
                    }
                ]
            });
        }).should.throw('Config._convertObjectToDotNotation: Arrays can only contain primitives.');
    });
});
//# sourceMappingURL=ObjectConfig.js.map
