// sandbox exit callback
declare function exit(output?:any):void;

// api methods
declare function getState():any;
declare function setState(state:any):void;

// plugin globals
declare function getFileName():string;
declare function getStats():Object;

export module main {

	export function onTest() {
		setState('foobar');
		var bar = getState();

		exit({ foo: 'foo', bar: bar });
	}

	/**
	 * Returns the mapping used in the elasticsearch index to store the plugin data
	 * The mapping doesn't include the document root!
	 *
	 * @see http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/indices-put-mapping.html
	 */
	export function getMapping () {
		var mapping = {
			_source: {
				excludes: ['file']
			},
			properties: {
				file: {
					type  : 'attachment',
					indexed_chars: -1,
					detect_anguage: true,
					fields: {
						file          : {
							store      : 'yes',
							term_vector: 'with_positions_offsets'
						},
						author        : {
							store: 'yes'
						},
						title         : {
							store   : 'yes'
						},
						date          : {
							store: 'yes'
						},
						keywords      : {
							store   : 'yes',
							analyzer: 'keyword'
						},
						content_type  : {
							store: 'yes'
						},
						content_length: {
							store: 'yes'
						},
						language: {
							store: 'yes'
						}
					}
				}
			}
		};

		exit(mapping);
	}

	export function onBeforeItemAdd () {
		var data = {
			name: getFileName(),
			stats: getStats()
		};

		exit(data);
	}
}