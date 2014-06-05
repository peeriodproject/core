/// <reference path='../../test.d.ts' />
require('should');

var TCPSocketHandlerFactory = require('../../../src/core/net/tcp/TCPSocketHandlerFactory');
var TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
var TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');

describe('CORE --> TOPOLOGY --> TCPSocketHandlerFactory', function () {
    it('should correctly create a tcp socket handler', function () {
        var handler = (new TCPSocketHandlerFactory()).create(new TCPSocketFactory(), {
            allowHalfOpenSockets: false,
            idleConnectionKillTimeout: 0,
            myExternalIp: '127.0.0.1'
        });
        handler.should.be.an.instanceof(TCPSocketHandler);
    });
});
//# sourceMappingURL=TCPSocketHandlerFactory.js.map
