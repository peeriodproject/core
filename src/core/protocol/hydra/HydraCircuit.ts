import events = require('events');
import crypto = require('crypto');

// crypto
import HKDF = require('../../crypto/HKDF');
import AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');

import HydraCircuitInterface = require('./interfaces/HydraCircuitInterface');

class HydraCircuit extends events.EventEmitter implements HydraCircuitInterface {

}

export = HydraCircuit;