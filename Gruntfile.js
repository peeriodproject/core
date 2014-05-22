'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        env: {
            test: {
                NODE_ENV: 'test'
            },
            dev : {
                NODE_ENV: 'development'
            },
            prod: {
                NODE_ENV: 'production'
            }
        },

        plato: {
            source: {
                options: {
                    exclude: /node_modules|reports|interfaces|namespace\.js|\.json/
                },
                files  : {
                    'build/js-source-analysis-report': ['src/**/*.js']
                }
            }
        },

        mochaTest: {
            test        : {
                options: {
                    reporter: 'spec',
                    require : 'test/config/coverage_blanket',
                    quiet   : false
                },
                src    : ['test/**/*.js']
            },
            coverage    : {
                options: {
                    reporter   : 'html-cov',
                    quiet      : true,
                    captureFile: 'build/coverage.html'
                },
                src    : ['test/**/*.js']
            },
            'travis-cov': {
                options: {
                    reporter: 'travis-cov'
                },
                src    : ['test/**/*.js']
            }
        },

        // monitors the compiled .js files so that external builders (e.g. WebStorm) trigger restart
        nodemon  : {
            dev: {
                options: {
                    file             : 'app/main.js',
                    watchedExtensions: ['js', 'json'],
                    watchedFolders   : ['app', 'config', 'test']
                }
            }
        },

        nodewebkit: {
            options: {
                build_dir: './webkitbuilds', // Where the build version of my node-webkit app is saved
                mac      : true, // We want to build it for mac
                win      : false, // We want to build it for win
                linux32  : false, // We don't need linux32
                linux64  : false // We don't need linux64
            },
            src    : ['./application.nw/**/*'] // Your node-webkit app
        },

        // execute 'grunt curl' manually to refresh the external definition files
        curl      : {
            'ts-definitions/fs-extra/fs-extra.d.ts'    : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/fs-extra/fs-extra.d.ts',
            'ts-definitions/mime/mime.d.ts'            : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/mime/mime.d.ts',
            'ts-definitions/mocha/mocha.d.ts'          : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/mocha/mocha.d.ts',
            'ts-definitions/node/node.d.ts'            : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/node/node.d.ts',
            'ts-definitions/should/should.d.ts'        : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/should/should.d.ts',
            'ts-definitions/sinon/sinon.d.ts'          : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/sinon/sinon.d.ts',
            'ts-definitions/superagent/superagent.d.ts': 'https://github.com/borisyankov/DefinitelyTyped/raw/master/superagent/superagent.d.ts',
            'ts-definitions/supertest/supertest.d.ts'  : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/supertest/supertest.d.ts',
            'ts-definitions/winston/winston.d.ts'      : 'https://github.com/borisyankov/DefinitelyTyped/raw/master/winston/winston.d.ts'
        }
    });

    // These plugins provide necessary tasks
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-curl');
    grunt.loadNpmTasks('grunt-node-webkit-builder');
    grunt.loadNpmTasks('grunt-plato');

    // Task aliases
    grunt.registerTask('createReports', ['env:test', 'mochaTest:coverage', 'plato:source']);
    grunt.registerTask('_runTests', ['env:test', 'mochaTest']);
    grunt.registerTask('test', ['_runTests']);
    grunt.registerTask('dev', ['env:dev', 'nodemon']);
    grunt.registerTask('prod', ['env:prod', 'nodemon']);

    // Default task
    grunt.registerTask('default', ['test']);
};
