var sheet = {
    hydraMessageTypes: {
        "ADDITIVE_SHARING": 0x01,
        "CREATE_CELL_ADDITIVE": 0x02,
        "ENCRYPTED_SPITOUT": 0x03,
        "ENCRYPTED_DIGEST": 0x04,
        "CELL_CREATED_REJECTED": 0x05,
        "FILE_TRANSFER": 0x06
    },
    circuitMessages: [
        "ENCRYPTED_SPITOUT",
        "ENCRYPTED_DIGEST",
        "CELL_CREATED_REJECTED"
    ],
    encryptedMessages: {
        "isReceiver": 0x01,
        "notReceiver": 0x00
    },
    createCellAdditive: {
        "isInitiator": 0x01,
        "notInitiator": 0x00
    }
};

module.exports = sheet;
//# sourceMappingURL=HydraByteCheatsheet.js.map
