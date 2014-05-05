import BucketFactoryInterface = require('./interfaces/BucketFactoryInterface');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
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

	public create (config:ConfigInterface, key:number, store:BucketStoreInterface):BucketInterface {
		return new Bucket(config, key, store);
	}

}

export = BucketFactory;