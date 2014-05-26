


(function (main) {
    function onTest() {
        setState('foobar');
        var bar = getState();

        exit({ foo: 'foo', bar: bar });
    }
    main.onTest = onTest;

    /**
    * Returns the mapping used in the elasticsearch index to store the plugin data
    *
    * @see http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/indices-put-mapping.html
    */
    function getMapping() {
        var mapping = {
            textdocument: {
                properties: {
                    file_attachment: {
                        type: 'attachment'
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
