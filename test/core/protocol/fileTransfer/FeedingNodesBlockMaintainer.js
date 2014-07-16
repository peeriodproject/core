/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var HydraCircuit = require('../../../../src/core/protocol/hydra/HydraCircuit');
var FeedingNodesBlockMaintainer = require('../../../../src/core/protocol/fileTransfer/share/FeedingNodesBlockMaintainer');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> FeedingNodesBlockMaintainer', function () {
    var circuitManagerStub = new events.EventEmitter();
    var sandbox = sinon.sandbox.create();

    var maintainedCircuitNodes = [];

    var blockMaintainer = null;

    it('should correctly initialize the block maintainer', function () {
        blockMaintainer = new FeedingNodesBlockMaintainer(circuitManagerStub);

        blockMaintainer.getCurrentNodeBatch().length.should.equal(0);
        blockMaintainer.getBlock().length.should.equal(1);
        circuitManagerStub.listeners('circuitCount').length.should.equal(1);
    });

    it('should correctly add new circuit nodes', function (done) {
        maintainedCircuitNodes = [
            [
                {
                    ip: '1.1.1.1',
                    port: 80,
                    feedingIdentifier: '21a3b57e5fc5871b8ded8cd38196effa'
                },
                {
                    ip: '2.2.2.2',
                    port: 80,
                    feedingIdentifier: '4a0ec8a9bd567e0c2b38f8e4191a391c'
                }
            ],
            [
                {
                    ip: '3.3.3.3',
                    port: 80,
                    feedingIdentifier: '21a3b57e5fc5871b8ded8cd38196effa'
                },
                {
                    ip: '4.4.4.4',
                    port: 80,
                    feedingIdentifier: '4a0ec8a9bd567e0c2b38f8e4191a391c'
                }
            ]
        ];

        blockMaintainer.once('nodeBatchLength', function (count) {
            count.should.equal(2);
            setImmediate(function () {
                done();
            });
        });

        circuitManagerStub.emit('circuitCount');

        var batch = blockMaintainer.getCurrentNodeBatch();

        batch.length.should.equal(2);

        ['1.1.1.1', '2.2.2.2'].should.containEql(batch[0].ip);
        ['3.3.3.3', '4.4.4.4'].should.containEql(batch[1].ip);
    });

    it('should correctly update the list when a circuit is removed and one is added', function () {
        maintainedCircuitNodes.splice(0, 1);

        maintainedCircuitNodes.push([
            {
                ip: '5.5.5.5',
                port: 80,
                feedingIdentifier: '21a3b57e5fc5871b8ded8cd38196effa'
            },
            {
                ip: '6.6.6.6',
                port: 80,
                feedingIdentifier: '4a0ec8a9bd567e0c2b38f8e4191a391c'
            }
        ]);
        maintainedCircuitNodes.push([
            {
                ip: '7.7.7.7',
                port: 80,
                feedingIdentifier: '21a3b57e5fc5871b8ded8cd38196effa'
            },
            {
                ip: '8.8.8.8',
                port: 80,
                feedingIdentifier: '4a0ec8a9bd567e0c2b38f8e4191a391c'
            }
        ]);

        circuitManagerStub.emit('circuitCount');

        var batch = blockMaintainer.getCurrentNodeBatch();
        batch.length.should.equal(3);

        ['3.3.3.3', '4.4.4.4'].should.containEql(batch[0].ip);
        ['5.5.5.5', '6.6.6.6'].should.containEql(batch[1].ip);
        ['7.7.7.7', '8.8.8.8'].should.containEql(batch[2].ip);

        maintainedCircuitNodes.splice(maintainedCircuitNodes.length - 1, 1);

        circuitManagerStub.emit('circuitCount');

        batch = blockMaintainer.getCurrentNodeBatch();

        batch.length.should.equal(2);

        ['3.3.3.3', '4.4.4.4'].should.containEql(batch[0].ip);
        ['5.5.5.5', '6.6.6.6'].should.containEql(batch[1].ip);
    });

    it('should correctly cleanup the maintainer', function () {
        blockMaintainer.cleanup();

        circuitManagerStub.listeners('circuitCount').length.should.equal(0);
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        circuitManagerStub.getRandomFeedingNodesBatch = function () {
            return [];
        };

        circuitManagerStub.getReadyCircuits = function () {
            var circuits = [];

            for (var i = 0; i < maintainedCircuitNodes.length; i++) {
                var circuitNodes = maintainedCircuitNodes[i];

                (function (cNodes) {
                    circuits.push(testUtils.stubPublicApi(sandbox, HydraCircuit, {
                        getCircuitNodes: function () {
                            return cNodes;
                        }
                    }));
                })(circuitNodes);
            }

            return circuits;
        };
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=FeedingNodesBlockMaintainer.js.map
