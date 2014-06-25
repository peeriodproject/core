import events = require('events');

import TransferMessageCenterInterface = require('./interfaces/TransferMessageCenterInterface');
import ReadableFileTransferMessageInterface = require('./messages/interfaces/ReadableFileTransferMessageInterface');


class TransferMessageCenter extends events.EventEmitter implements TransferMessageCenterInterface {



}

export = TransferMessageCenter;
