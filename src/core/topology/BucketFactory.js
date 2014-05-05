var Bucket = require('./Bucket');

/**
* The `BucketFactory` creates {@link core.topology.Bucket} according to the {@link core.topology.BucketInterface}.
*
* @class core.topology.BucketFactory
* @implements core.topology.BucketFactoryInterface
*/
var BucketFactory = (function () {
    function BucketFactory() {
    }
    BucketFactory.prototype.create = function (config, bucketKey, maxBucketSize, store) {
        return new Bucket(config, bucketKey, maxBucketSize, store);
    };
    return BucketFactory;
})();

module.exports = BucketFactory;
//# sourceMappingURL=BucketFactory.js.map
