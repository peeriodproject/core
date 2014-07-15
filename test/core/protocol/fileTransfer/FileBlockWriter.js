/// <reference path='../../../test.d.ts' />
require('should');

var fs = require('fs');
var testUtils = require('../../../utils/testUtils');

var FileBlockWriter = require('../../../../src/core/protocol/fileTransfer/share/FileBlockWriter');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> FileBlockWriter @current', function () {
    var filename = 'snowden_brighton_2.jpg';
    var sha1Hash = '4dad5e4374038a14465f0c42fc150a36674b4bd8';
    var filesize = 517880;
    var originPath = testUtils.getFixturePath('core/fileTransfer/snowden_brighton.jpg');
    var writePath = testUtils.getFixturePath('core/fileTransfer/');
    var readDescriptor = 0;

    var blockWriter = null;

    var posToRead = 0;

    it('should correctly prepare to write the file block writer', function (done) {
        blockWriter = new FileBlockWriter(filename, writePath, filesize, sha1Hash);

        blockWriter.prepareToWrite(function (err) {
            (err === null).should.be.true;
            done();
        });
    });

    it('should successfully write a block', function (done) {
        var buf = new Buffer(200000);

        fs.read(readDescriptor, buf, 0, 200000, posToRead, function (err, bytesRead, buffer) {
            if (err)
                throw err;

            bytesRead.should.equal(200000);

            blockWriter.writeBlock(buffer, function (err, fullCountOfWrittenBytes, isFinished) {
                (err === null).should.be.true;
                fullCountOfWrittenBytes.should.equal(200000);
                isFinished.should.be.false;
                posToRead = fullCountOfWrittenBytes;
                done();
            });
        });
    });

    it('should successfully finish the file', function (done) {
        var buf = new Buffer(317880);

        fs.read(readDescriptor, buf, 0, 317880, posToRead, function (err, bytesRead, buffer) {
            if (err)
                throw err;

            bytesRead.should.equal(317880);

            blockWriter.writeBlock(buffer, function (err, fullCountOfWrittenBytes, isFinished) {
                (err === null).should.be.true;
                fullCountOfWrittenBytes.should.equal(517880);
                isFinished.should.be.true;
                done();
            });
        });
    });

    it('should do nothing when aborting a block writer that has already been finished', function (done) {
        blockWriter.abort(done);
    });

    it('should callback an error when trying to prepare a new block writer on the same path', function (done) {
        var writer = new FileBlockWriter(filename, writePath, filesize, sha1Hash);
        writer.prepareToWrite(function (err) {
            if (err)
                done();
        });
    });

    it('should successfully delete the file', function (done) {
        fs.existsSync(writePath + filename).should.be.true;

        blockWriter.deleteFile(function (err) {
            (err === null).should.be.true;
            fs.existsSync(writePath + filename).should.be.false;
            done();
        });
    });

    it('should do nothing when deleting a file that has already been deleted', function (done) {
        blockWriter.deleteFile(done);
    });

    it('should abort a file block writer when the file descriptor is closed', function (done) {
        blockWriter = new FileBlockWriter(filename, writePath, filesize, sha1Hash);

        blockWriter.prepareToWrite(function (err) {
            (err === null).should.be.true;
            blockWriter.canBeWritten().should.be.true;

            var buffer = new Buffer(10);

            var fd = blockWriter.getFileDescriptor();

            fs.closeSync(fd);

            blockWriter.writeBlock(buffer, function (err) {
                (!!err).should.be.true;
                blockWriter.canBeWritten().should.be.false;
                done();
            });
        });
    });

    it('should correctly write only the expected number of bytes, event when a bigger buffer is given, but abort when the hashe do not match', function (done) {
        blockWriter = new FileBlockWriter(filename, writePath, filesize, sha1Hash + 'ff');

        blockWriter.prepareToWrite(function (err) {
            (!!err).should.be.false;
            blockWriter.canBeWritten().should.be.true;

            fs.existsSync(writePath + filename).should.be.true;

            var buf = new Buffer(517888);

            fs.read(readDescriptor, buf, 0, 517880, 0, function (err, bytesRead, buffer) {
                bytesRead.should.equal(517880);
                buffer.length.should.equal(517888);

                blockWriter.writeBlock(buffer, function (err, fullCountOfBytesWritten) {
                    err.message.should.equal('FileBlockWriter: Hashes do not match.');
                    fullCountOfBytesWritten.should.equal(517880);
                    fs.existsSync(writePath + filename).should.be.false;

                    blockWriter.canBeWritten().should.be.false;
                    done();
                });
            });
        });
    });

    it('should callback an error when trying to write a block to a block writer which has already been aborted', function (done) {
        blockWriter.writeBlock(new Buffer(1), function (err) {
            err.message.should.equal('FileBlockWriter: Cannot be written to.');
            done();
        });
    });

    before(function (done) {
        fs.open(originPath, 'r', function (err, fd) {
            if (err)
                throw err;

            readDescriptor = fd;
            done();
        });
    });

    after(function (done) {
        if (readDescriptor) {
            fs.close(readDescriptor, function () {
                fs.unlink(writePath + filename, function (err) {
                    done();
                });
            });
        }
    });
});
//# sourceMappingURL=FileBlockWriter.js.map
