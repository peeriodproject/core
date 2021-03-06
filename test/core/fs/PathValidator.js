/// <reference path='../../test.d.ts' />
var fs = require('fs');
require('should');

var testUtils = require('../../utils/testUtils');

var PathValidator = require('../../../src/core/fs/PathValidator');

describe('CORE --> FS --> PathValidator', function () {
    it('should correctly instantiate the validator', function () {
        (new PathValidator()).should.be.an.instanceof(PathValidator);
    });

    it('should return the correct checksum for the specified path', function (done) {
        var filePath = testUtils.getFixturePath('core/fs/pathValidator/file.txt');
        var validator = new PathValidator();

        validator.getHash(filePath, function (err, fileHash) {
            (err === null).should.be.true;
            fileHash.should.equal('e1e4253dc84cf0709240576e8f1a26762499a865');

            done();
        });
    });

    it('should return that the specified checksum is correct for the given path', function (done) {
        var filePath = testUtils.getFixturePath('core/fs/pathValidator/file.txt');
        var validator = new PathValidator();

        validator.validateHash(filePath, 'e1e4253dc84cf0709240576e8f1a26762499a865', function (err, isValid, fileHash) {
            (err === null).should.be.true;
            isValid.should.be.true;
            fileHash.should.equal('e1e4253dc84cf0709240576e8f1a26762499a865');

            done();
        });
    });

    it('should correctly return that the specified checksum is not valid', function (done) {
        var filePath = testUtils.getFixturePath('core/fs/pathValidator/file.txt');
        var validator = new PathValidator();

        validator.validateHash(filePath, 'randomChecksum', function (err, isValid, fileHash) {
            (err === null).should.be.true;
            isValid.should.be.false;
            fileHash.should.equal('e1e4253dc84cf0709240576e8f1a26762499a865');

            done();
        });
    });

    it('should correctly return an error if the file path is not valid', function (done) {
        var filePath = testUtils.getFixturePath('core/fs/pathValidator/invalid.txt');
        var validator = new PathValidator();

        validator.validateHash(filePath, 'randomChecksum', function (err, isValid, fileHash) {
            err.should.be.an.instanceof(Error);
            isValid.should.be.false;
            (fileHash === null).should.be.true;

            done();
        });
    });

    it('should return that the specified stats object is correct for the given path', function (done) {
        var filePath = testUtils.getFixturePath('core/fs/pathValidator/file.txt');
        var validator = new PathValidator();
        var validStats = fs.statSync(filePath);

        // dev and atime removed
        var expectedStats = validStats;

        delete expectedStats['dev'];
        delete expectedStats['atime'];

        validator.validateStats(filePath, validStats, function (err, isValid, fileStats) {
            (err === null).should.be.true;
            isValid.should.be.true;
            JSON.stringify(fileStats).should.equal(JSON.stringify(expectedStats));

            done();
        });
    });
});
//# sourceMappingURL=PathValidator.js.map
