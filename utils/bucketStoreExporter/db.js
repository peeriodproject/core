var path = require('path');
var lmdb = require('node-lmdb');

module.exports = {
    init: function () {
        var env = new lmdb.Env();
        var dbPath = path.join(__dirname, '../../src/db');
        var name = 'bucketstore';

        var ids = [];
        var data = {};

        env.open({
            path: dbPath
        });

        var dbi = env.openDbi({
            name: name
        });

        var txn = env.beginTxn({ readOnly: true });
        var bucketCursor = new lmdb.Cursor(txn, dbi);

        for (var found = bucketCursor.goToRange('0-'); found; found = bucketCursor.goToNext()) {
            // bucket item
            if (found.indexOf('-') !== -1) {
                var bucketKey = found.split('-')[0];

                if (!data[bucketKey]) {
                    data[bucketKey] = [];
                }

                bucketCursor.getCurrentBinary(function (key, idBuffer) {
                    var item = JSON.parse(txn.getString(dbi, idBuffer.toString('hex')));
                    item.id = new Buffer(item.id).toString('hex');

                    data[bucketKey].push(item);
                });
            }
        }

        // cleanup
        bucketCursor.close();
        txn.commit();

        dbi.close();
        env.close();

        return data;
    }
};