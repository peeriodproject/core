/**
 * loads the mimetypes used by Apache Tika and parses them into a plugin config firendly format
 *
 * @see https://tika.apache.org/1.5/formats.html
 * @see https://svn.apache.org/repos/asf/tika/trunk/tika-core/src/main/resources/org/apache/tika/mime/tika-mimetypes.xml
 */
var fs = require('fs');
var http = require('http');
var tikaMimeTypesUrl = 'http://svn.apache.org/repos/asf/tika/trunk/tika-core/src/main/resources/org/apache/tika/mime/tika-mimetypes.xml';
var filePath = __dirname + '/fileTypes.json';

var fetchMimeTypes = function (callback) {
    var http = require('http');

    var bodyarr = [];
    http.get(tikaMimeTypesUrl, function (res) {
        res.on('data', function (chunk) {
            bodyarr.push(chunk);
        });
        res.on('end', function () {
            callback(bodyarr.join('').toString());
        });
    }).on('error', function (e) {
        callback(e.message);
    });
};

var extensions = [];
var mimeTypes = [];

var parseRegex = function (xml, regEx, index, list) {
    var m;

    while ((m = regEx.exec(xml)) != null) {
        if (m.index === regEx.lastIndex) {
            regEx.lastIndex++;
        }

        var found = m[index];

        if (list.indexOf(found) === -1) {
            list.push(found);
        }
    }
};

var parseXml = function (xml) {
    parseRegex(xml, /(\s+?)<glob pattern="(.*?)"(\/)?>/g, 2, extensions);
    parseRegex(xml, /(\s+?)<mime-type type="(.*?)"(\/)?>/g, 2, mimeTypes);
};

var writeJson = function () {
    var data = {
        extensions: extensions,
        mimeTypes: mimeTypes
    };

    fs.writeFile(filePath, JSON.stringify(data, null, 4), function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + filePath + "\nOver and out!\n");
        }
    });
}

var report = function () {
    console.log("\n--------------------------------------------");
    console.log('found ', mimeTypes.length, 'mime types');
    console.log('found ', extensions.length, 'extensions' + "\n");
};

// run it!
fetchMimeTypes(function (xml) {
    console.log("Fetching mime types and extensions from\n" + tikaMimeTypesUrl);
    parseXml(xml);
    report();
    writeJson();
});

