import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import BucketStoreInterface = require('./BucketStoreInterface');
import BucketInterface = require('./BucketInterface');

/**
 * The `BucketFactoryInterface` provides an Interface to create objects which implements the {@link core.topology.BucketInterface}
 *
 * @interface
 * @class core.topology.BucketFactoryInterface
 */
interface BucketFactoryInterface {

	/**
	 * @method core.topology.BucketFactoryInterface#create
	 *
	 * @param {core.topology.ConfigInterface} config The config object which stores the `topology.k` value
	 * @param {string} key The name of the bucket
	 * @param {core.topology.BucketStoreInterface} store The internally used bucket store
	 * @returns {core.topology.BucketInterface}
	 */
	create (config:ConfigInterface, key:number, store:BucketStoreInterface):BucketInterface;

}

export = BucketFactoryInterface;