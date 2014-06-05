#!/usr/local/bin/node

var fs = require('fs');
var path = require('path');

var node_modules = path.join(__dirname, '../../src/node_modules');
var modules = fs.readdirSync(node_modules);

var linkTo = ''; // node or node-webkit

for (var i in process.argv) {
    var arg = process.argv[i];

    if (arg.indexOf('=') != -1) {
        var splitted = arg.split('=');
        if (splitted[1] === 'node' || splitted[1] === 'node-webkit') {
            linkTo = splitted[1];
            break;
        }
    }
}

console.log('Linking to:', linkTo);

for (var i in modules) {
    var module = modules[i];
    var modulePath = path.join(node_modules, module);
    var stat = fs.statSync(modulePath);

    if (stat.isDirectory()) {

        // check for bindings
        if (fs.existsSync(path.join(modulePath, 'binding.gyp'))) {
            var buildFolder = path.join(modulePath, 'build_' + linkTo);
            var buildDest =  path.join(modulePath, 'build');

            console.log(module, 'has native c modules');


            if (fs.existsSync(buildFolder)) {
                if (fs.existsSync(buildDest)) {
                    var destStat = fs.lstatSync(buildDest);
                    if (destStat.isSymbolicLink()) {
                        // remove old symlink
                        fs.unlinkSync(buildDest);
                    }
                    else {
                        console.log(module, 'PLEASE REMOVE BUILD FOLDER FIRST!!!');
                    }
                }

                try {
                    fs.symlinkSync(buildFolder, buildDest, 'dir');
                    console.log('linked', buildFolder, 'to ./build');
                }
                catch (e) {
                    console.error(e);
                }
            }
            else {
                console.error(module, ': build_' + linkTo + ' not found!!!');
            }
        }
    }
}