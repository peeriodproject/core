/// <reference path='../../../test.d.ts' />
require('should');

var ReadableShareAbortMessage = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareAbortMessage');
var WritableShareAbortMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableShareAbortMessageFactory');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> WritableShareAbortMessageFactory (via readable message)', function () {
    it('should correctly construct the SHARE_ABORT message', function () {
        var filename = 'This is a file.jpg';
        var filesize = 12345632434;
        var hash = '770606aff59bca0b045d8e0eaf5a7a7568bc1d39';

        var factory = new WritableShareAbortMessageFactory();

        var msg = new ReadableShareAbortMessage(factory.constructMessage(filesize, filename, hash));

        msg.getFileHash().should.equal(hash);
        msg.getFilename().should.equal(filename);
        msg.getFilesize().should.equal(filesize);
    });
});
//# sourceMappingURL=WritableShareAbortMessageFactory.js.map
