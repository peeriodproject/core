/// <reference path='../../ts-definitions/node/node.d.ts' />
//
// a tiny helper to run elasticsearch independent with application settings
//
var childProcess = require('child_process');
var path = require('path');

var rootPath = path.resolve(__dirname, '../..');
var binaryPath = path.join(rootPath, 'src/bin/core/search/elasticsearch/bin/elasticsearch');
var args = [
    '-Des.config=' + path.join(rootPath, 'src/config/searchStore.json'),
    '-Des.path.data=' + path.resolve(__dirname, 'data')
];

var process = childProcess.execFile(binaryPath, args, {}, function (err, stdout, stderr) {
    if (err) {
        console.error(err);
    } else {
        console.log('running...');
    }
});

process.stdout.on('data', function (data) {
    console.log(data);
});

process.stderr.on('data', function (data) {
    console.error(data);
});
//# sourceMappingURL=index.js.map
