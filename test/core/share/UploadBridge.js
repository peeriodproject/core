/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var UploadBridge = require('../../../src/core/share/UploadBridge');
var UploadManager = require('../../../src/core/share/UploadManager');

describe('CORE --> SHARE --> UploadBridge', function () {
    var sandbox;
    var uploadManagerStub;

    var bridge;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        uploadManagerStub = testUtils.stubPublicApi(sandbox, UploadManager);

        bridge = new UploadBridge(uploadManagerStub);
    });

    afterEach(function () {
        sandbox.restore();

        bridge = null;
        uploadManagerStub = null;
        sandbox = null;
    });

    it('should correctly instantiate the UploadBridge', function () {
        bridge.should.be.an.instanceof(UploadBridge);
    });

    it('should correctly forward the getFileInfoByHash method', function () {
        var callback = function () {
        };
        bridge.getFileInfoByHash('hash', callback);

        uploadManagerStub.getFileInfoByHash.calledOnce.should.be.true;
        uploadManagerStub.getFileInfoByHash.getCall(0).args[0].should.equal('hash');
        uploadManagerStub.getFileInfoByHash.getCall(0).args[1].should.equal(callback);
    });

    describe('it should correctly forward the events from the upload manager', function () {
        it('upload was added', function () {
            bridge.emit('newUpload', 'uploadId', '/path/to/file.ext', 'file.ext', 123);

            uploadManagerStub.createUpload.calledOnce.should.be.true;
            var args = uploadManagerStub.createUpload.getCall(0).args;

            args[0].should.equal('uploadId');
            args[1].should.equal('/path/to/file.ext');
            args[2].should.equal('file.ext');
            args[3].should.equal(123);
        });

        it('upload was removed', function () {
            var abortUploadSpy = sandbox.spy();
            bridge.on('abortUpload', abortUploadSpy);

            uploadManagerStub.onUploadCanceled.getCall(0).args[0]('uploadId');

            abortUploadSpy.calledOnce.should.be.true;
            abortUploadSpy.getCall(0).args[0].should.equal('uploadId');
        });
    });

    describe('it should correctly forward events received from the event emitter', function () {
        it('should correctly forward the `ratifyingRequest` event', function () {
            bridge.emit('ratifyingRequest', 'uploadId');

            uploadManagerStub.updateUploadStatus.calledOnce.should.be.true;

            uploadManagerStub.updateUploadStatus.getCall(0).args[0].should.equal('uploadId');
            uploadManagerStub.updateUploadStatus.getCall(0).args[1].should.equal('RATIFYING_REQUEST');
        });

        it('should correctly forward the `startingUpload` event', function () {
            bridge.emit('startingUpload', 'uploadId');

            uploadManagerStub.updateUploadStatus.calledOnce.should.be.true;

            uploadManagerStub.updateUploadStatus.getCall(0).args[0].should.equal('uploadId');
            uploadManagerStub.updateUploadStatus.getCall(0).args[1].should.equal('UPLOAD_STARTED');
        });

        it('should correctly forward the `manuallyAborted` event', function () {
            bridge.emit('manuallyAborted', 'uploadId');

            uploadManagerStub.updateUploadStatus.calledOnce.should.be.true;

            uploadManagerStub.updateUploadStatus.getCall(0).args[0].should.equal('uploadId');
            uploadManagerStub.updateUploadStatus.getCall(0).args[1].should.equal('MANUAL_ABORT');
        });

        it('should correctly forward the `end` event', function () {
            bridge.emit('end', 'uploadId', 'reason');

            uploadManagerStub.uploadEnded.calledOnce.should.be.true;

            uploadManagerStub.uploadEnded.getCall(0).args[0].should.equal('uploadId');
            uploadManagerStub.uploadEnded.getCall(0).args[1].should.equal('reason');
        });
    });
});
//# sourceMappingURL=UploadBridge.js.map
