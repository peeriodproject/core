/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> Middleware @current', function () {
    var sandbox = null;

    var socketCount = 0;
    var openSockets = [];

    var protocolConnectionManagerStub = null;
    var hydraMessageCenterStub = null;
    var writableFileTransferFactoryStub = null;
    var cellManagerStub = null;
    var middleware = null;

    var connectEmitter = new events.EventEmitter();

    before(function () {
        sandbox = sinon.sandbox.create();

        protocolConnectionManagerStub = new events.EventEmitter();

        protocolConnectionManagerStub.hydraConnectTo = function (port, ip, cb) {
            connectEmitter.emit('obtaining', port, ip);
            connectEmitter.once(ip + '_' + port, function (success) {
                var ident = null;
                var err = null;

                if (success) {
                    ident = 'socket' + ++socketCount;
                } else {
                    err = new Error();
                }

                setImmediate(function () {
                    cb(err, ident);
                });
            });
        };

        protocolConnectionManagerStub.closeHydraSocket = function (identifier) {
            var index = openSockets.indexOf(identifier);

            if (index >= 0) {
                openSockets.splice(index, 1);
            }
        };
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=Middleware.js.map
