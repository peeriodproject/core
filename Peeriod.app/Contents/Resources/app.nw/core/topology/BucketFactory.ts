import BucketFactoryInterface = require('./interfaces/BucketFactoryInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import ContactNodeFactoryInterface = require('./interfaces/ContactNodeFactoryInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import BucketInterface = require('./interfaces/BucketInterface');

import Bucket = require('./Bucket');

/**
 * The `BucketFactory` creates {@link core.topology.Bucket} according to the {@link core.topology.BucketInterface}.
 *
 * @class core.topology.BucketFactory
 * @implements core.topology.BucketFactoryInterface
 */
class BucketFactory implements BucketFactoryInterface {

	public create (config:ConfigInterface, bucketKey:number, maxBucketSize:number, store:BucketStoreInterface, contactNodeFactory:ContactNodeFactoryInterface):BucketInterface {
		return new Bucket(config, bucketKey, maxBucketSize, store, contactNodeFactory);
	}

}

export = BucketFactory;