// sandbox exit callback
declare function exit (output?:any):void;

// api methods
declare function getState ():any;
declare function setState (state:any):void;

// plugin globals
declare function getFileName ():string;
declare function getStats ():Object;

declare var fileName:string;
declare var fileStats:Object;


export var main = {

	/**
	 * Returns the mapping used in the elasticsearch index to store the plugin data
	 * The mapping doesn't include the document root!
	 *
	 * @see http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/indices-put-mapping.html
	 */
	getMapping: function () {
		exit({
			_source   : {
				excludes: ['file']
			},
			properties: {
				file: {
					type          : 'attachment',
					indexed_chars : -1,
					detect_anguage: true,
					fields        : {
						file          : {
							store      : 'yes',
							term_vector: 'with_positions_offsets'
						},
						author        : {
							store: 'yes'
						},
						title         : {
							store: 'yes'
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
						language      : {
							store: 'yes'
						}
					}
				}
			}
		});
	},

	getSearchFields: function () {
		exit({
			"action": "index.html",
			"method": "get",
			"html"  : [
				{
					"type": "p",
					"html": "You must login"
				},
				{
					"name"       : "username",
					"id"         : "txt-username",
					"caption"    : "Username",
					"type"       : "text",
					"placeholder": "E.g. user@example.com"
				},
				{
					"name"   : "password",
					"caption": "Password",
					"type"   : "password"
				},
				{
					"type" : "submit",
					"value": "Login"
				}
			]
		});
	},

	onBeforeItemAdd: function () {
		exit({
			name : fileName,
			stats: fileStats
		});
	}
};