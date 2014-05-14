var sheet = {
    messageBegin: [0x50, 0x52, 0x44, 0x42, 0x47, 0x4e],
    messageEnd: [0x50, 0x52, 0x44, 0x45, 0x4e, 0x44],
    ipv4: 0x04,
    ipv6: 0x06,
    addressEnd: 0x05,
    messageTypes: {
        "PING": [0x50, 0x49],
        "PONG": [0x50, 0x4f],
        "PROXY_REQUEST": [0x50, 0x01],
        "PROXY_ACCEPT": [0x50, 0x02],
        "PROXY_REJECT": [0x50, 0x03],
        "PROXY_THROUGH": [0x50, 0x04]
    }
};

module.exports = sheet;
//# sourceMappingURL=MessageByteCheatsheet.js.map
