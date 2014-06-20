


(function (main) {
    function onTest() {
        setState('foobar');
        var bar = getState();

        exit({ foo: 'foo', bar: bar });
    }
    main.onTest = onTest;

    function getSearchFields() {
        var fields = {
            "action": "index.html",
            "method": "get",
            "html": [
                {
                    "type": "p",
                    "html": "You must login"
                },
                {
                    "name": "username",
                    "id": "txt-username",
                    "caption": "Username",
                    "type": "text",
                    "placeholder": "E.g. user@example.com"
                },
                {
                    "name": "password",
                    "caption": "Password",
                    "type": "password"
                },
                {
                    "type": "submit",
                    "value": "Login"
                }
            ]
        };

        exit(fields);
    }
    main.getSearchFields = getSearchFields;

    /**
    * Returns the mapping used in the elasticsearch index to store the plugin data
    * The mapping doesn't include the document root!
    *
    * @see http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/indices-put-mapping.html
    */
    function getMapping() {
        var mapping = {
            _source: {
                excludes: ['file']
            },
            properties: {
                file: {
                    type: 'attachment',
                    indexed_chars: -1,
                    detect_anguage: true,
                    fields: {
                        file: {
                            store: 'yes',
                            term_vector: 'with_positions_offsets'
                        },
                        author: {
                            store: 'yes'
                        },
                        title: {
                            store: 'yes'
                        },
                        date: {
                            store: 'yes'
                        },
                        keywords: {
                            store: 'yes',
                            analyzer: 'keyword'
                        },
                        content_type: {
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
    main.getMapping = getMapping;

    function onBeforeItemAdd() {
        var data = {
            name: getFileName(),
            stats: getStats()
        };

        exit(data);
    }
    main.onBeforeItemAdd = onBeforeItemAdd;
})(exports.main || (exports.main = {}));
var main = exports.main;
//# sourceMappingURL=index.js.map
