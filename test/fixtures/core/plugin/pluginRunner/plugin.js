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
            fileBuffer: fileBuffer,
            foo       : 'bar',
            bar       : 'foo'
        });
    }
};