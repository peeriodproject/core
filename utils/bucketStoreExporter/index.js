var fs = require('fs');
var db = require('./db');

var gui = require('nw.gui');

var data = db.init();
var fileName = 'bucketStore-' + Date.now() + '.json';

fs.writeFile('./exports/' + fileName, JSON.stringify(data, null, 4), function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log('JSON saved to', fileName);

        gui.App.quit();
    }
});