var Bucket = require('./Bucket');

var BucketFactory = (function () {
    function BucketFactory() {
    }
    BucketFactory.prototype.create = function (config, key, store) {
        return new Bucket(config, key, store);
    };
    return BucketFactory;
})();

module.exports = BucketFactory;
//# sourceMappingURL=BucketFactory.js.map
