/// <reference path='../../test.d.ts' />
require('should');

var TCPSocket = require('../../../src/core/net/tcp/TCPSocket');
var events = require('events');
var net = require('net');

var socket_opts = {
    "idleConnectionKillTimeout": 2,
    "heartbeatTimeout": 0.5,
    "doKeepAlive": true,
    "simulatorRTT": 1
};

var doEcho = true;

// echoing server
var server = net.createServer(function (socket) {
    socket.setKeepAlive(true, 0);

    socket.on('data', function (data) {
        if (doEcho)
            socket.write(data);
    });
});

describe('CORE --> NET --> TCP --> TCPSocket', function () {
    before(function (done) {
        server.listen(9002, 'localhost', function () {
            done();
        });
    });

    var socket = null;

    before(function (done) {
        var sock = net.createConnection(9002, 'localhost');

        sock.on('connect', function () {
            socket = new TCPSocket(sock, socket_opts);
            done();
        });
    });

    after(function (done) {
        server.close(function () {
            done();
        });
    });

    it('should inherit event emitter', function () {
        socket.should.be.instanceof(events.EventEmitter);
    });

    it('should successfully set and get the identifier', function () {
        socket.setIdentifier('foobar');
        socket.getIdentifier().should.equal('foobar');
    });

    it('getSocket should return the socket', function () {
        socket.getSocket().should.be.instanceof(net.Socket);
    });

    it('constructing a TCP socket without a valid net.Socket should throw an error', function () {
        (function () {
            new TCPSocket('foo', socket_opts);
        }).should.throw('TCPSocket.constructor: Invalid or no socket specified');
    });

    it('should successfully write a buffer to the raw socket', function (done) {
        socket.writeBuffer(new Buffer([20]), function () {
            done();
        });
    });

    it('should successfully retrieve buffer data', function (done) {
        socket.once('data', function (buffer) {
            if ((buffer instanceof Buffer) && buffer[0] == 20) {
                done();
            } else {
                throw new Error('socket could not successfully retrieve data');
            }
        });

        socket.writeBuffer(new Buffer([20]));
    });

    it('should successfully write and retrieve a UTF-8 string', function (done) {
        var theString = 'foobar';
        socket.once('data', function (data) {
            if (data.toString() == theString) {
                done();
            } else
                throw new Error('did not successfully write utf-8 string');
        });
        socket.writeString(theString);
    });

    it('should successfully close an idle socket', function (done) {
        this.timeout(0);
        socket.once('close', function () {
            done();
        });
    });

    it('should not close the socket when dynamically setting keepOpen to true', function (done) {
        this.timeout(0);
        var sock_b = net.createConnection(9002, 'localhost');
        var socket_b = null;
        var all_good = true;
        sock_b.on('connect', function () {
            socket_b = new TCPSocket(sock_b, socket_opts);

            socket_b.setKeepOpen(true);

            socket_b.once('close', function () {
                all_good = false;
            });

            setTimeout(function () {
                if (all_good) {
                    socket_b.end();
                    done();
                }
            }, 4300);
        });
    });

    it('should close the socket when heartbeating but the other side does not heartbeat', function (done) {
        this.timeout(0);
        doEcho = false;
        var sock_c = net.createConnection(9002, 'localhost');

        sock_c.on('connect', function () {
            var socket = new TCPSocket(sock_c, socket_opts);

            socket.setKeepOpen(true);

            socket.once('close', function () {
                doEcho = true;
                done();
            });
        });
    });

    it('should close the socket keeping the socket open but then keeping it no longer open', function (done) {
        this.timeout(0);

        var sock = net.createConnection(9002, 'localhost');

        sock.on('connect', function () {
            var socket = new TCPSocket(sock, socket_opts);

            var closeList1 = function () {
                throw new Error('Should not close socket');
            };

            socket.once('close', closeList1);

            socket.setKeepOpen(true);

            setTimeout(function () {
                socket.removeListener('close', closeList1);

                socket.once('close', function () {
                    done();
                });

                socket.setKeepOpen(false);
            }, 3000);
        });
    });
});
//# sourceMappingURL=TCPSocket.js.map
