/// <reference path='../../../test.d.ts' />

require('should');

import ReadableQueryResponseMessage = require('../../../../src/core/protocol/fileTransfer/messages/ReadableQueryResponseMessage');
import WritableQueryResponseMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableQueryResponseMessageFactory');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> QueryResponse (writer and reader)', function () {

	it('should correctly format and deformat the message', function () {
		var payload = new Buffer('foobar');

		var nodes = [{
			ip: '1.1.1.1',
			port: 80,
			feedingIdentifier: 'cafebabecafebabecafebabecafebabe'
		}];

		var msg = new ReadableQueryResponseMessage((new WritableQueryResponseMessageFactory()).constructMessage(nodes, payload));

		msg.getResponseBuffer().toString().should.equal('foobar');
		var node = msg.getFeedingNodes()[0];

		node.ip.should.equal('1.1.1.1');
		node.port.should.equal(80);
		node.feedingIdentifier.should.equal('cafebabecafebabecafebabecafebabe');
	});
});