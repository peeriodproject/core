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

    getQuery: function () {
        exit({
            "term": {
                "field": query
            }
        });
    },

    getResultFields: function () {
        exit({
            _template: 'text',
            title   : 'title',
            content : 'content'
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
                }
            ]
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