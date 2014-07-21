/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> Upload (integration with Download) @current', function () {
    var sandbox = null;

    var uploadFolder = testUtils.getFixturePath('core/fileTransfer/snowden_brighton.jpg');
    var downloadFolder = testUtils.getFixturePath('core/fileTransfer/download');

    var downloaderMiddleware = new events.EventEmitter();
    var uploaderMiddleware = new events.EventEmitter();

    before(function () {
        sandbox = sinon.sandbox.create();
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=Upload.js.map
