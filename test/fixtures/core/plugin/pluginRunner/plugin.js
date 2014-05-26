exports.main = {
    getMapping: function () {
        exit({
            "tweet": {
                "properties": {
                    "message": {"type": "string", "store": true }
                }
            }
        });
    },

    onBeforeItemAdd: function () {
        exit({
            fileStream: fileStream,
            foo: 'bar',
            bar: 'foo'
        });
    }
};