/// <reference path='../../../ts-definitions/node/node.d.ts' />
var Padding = (function () {
    function Padding() {
    }
    Padding.pad = function (buffer, toLength) {
        var bufferLength = buffer.length;

        if (bufferLength === toLength) {
            return buffer;
        } else {
            var retBuf = new Buffer(toLength);
            retBuf.fill(0x00);
            buffer.copy(retBuf, toLength - bufferLength, 0);
            return retBuf;
        }
    };
    return Padding;
})();

module.exports = Padding;
//# sourceMappingURL=Padding.js.map
