var test = require('node:test');
var assert = require('node:assert');
var splicer = require('../');
var helpers = require('./helpers.js');
var through = helpers.through;
var concat = helpers.concat;
var deps = require('module-deps');
var pack = require('browser-pack');

test('bundle', function () {
    return new Promise(function (resolve, reject) {
        var pipeline = splicer.obj([
            'deps', [ deps() ],
            'pack', [ pack({ raw: true }) ]
        ]);
        pipeline.pipe(concat(function (body) {
            try {
                Function([ 'console' ], body.toString('utf8'))({ log: log });
            } catch (err) { reject(err); }
            function log (msg) {
                try {
                    assert.strictEqual(msg, 'main: 56055');
                    resolve();
                } catch (err) { reject(err); }
            }
        }));

        pipeline.get('deps').push(through.obj(function (row, enc, next) {
            row.source = row.source.replace(/111/g, '11111');
            this.push(row);
            next();
        }));

        pipeline.end(__dirname + '/bundle/main.js');
    });
});
