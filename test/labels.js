var test = require('node:test');
var assert = require('node:assert');
var splicer = require('../');
var helpers = require('./helpers.js');
var through = helpers.through;

function upper() {
    return through.obj(function (row, enc, next) { next(null, String(row).toUpperCase()); });
}
function suffix(s) {
    return through.obj(function (row, enc, next) { next(null, row + s); });
}
function collect(objectMode, cb) {
    var rows = [];
    return through.obj(function (row, enc, next) { rows.push(row); next(); })
        .on('finish', function () { cb(rows); });
}

test('indexOf / get by label', function () {
    var p = splicer.obj([ 'up', [ upper() ], 'excl', [ suffix('!') ] ]);
    assert.strictEqual(p.indexOf('up'), 0);
    assert.strictEqual(p.indexOf('excl'), 1);
    assert.strictEqual(p.indexOf('missing'), -1);
    assert.strictEqual(p.get('up').label, 'up');
    assert.strictEqual(p.get('excl').label, 'excl');
    assert.strictEqual(p.get('missing'), undefined);
    // numeric access still delegates to the underlying splicer
    assert.strictEqual(p.get(0), p.get('up'));
    assert.strictEqual(p.get(-1), p.get('excl'));
});

test('data flows through labelled stages', function () {
    return new Promise(function (resolve, reject) {
        var p = splicer.obj([ 'up', [ upper() ], 'excl', [ suffix('!') ] ]);
        var sink = collect(true, function (rows) {
            try {
                assert.deepStrictEqual(rows, [ 'A!', 'B!' ]);
                resolve();
            } catch (err) { reject(err); }
        });
        p.pipe(sink);
        p.write('a');
        p.write('b');
        p.end();
    });
});

test('splice by label replaces a stage', function () {
    return new Promise(function (resolve, reject) {
        var p = splicer.obj([ 'up', [ upper() ], 'excl', [ suffix('!') ] ]);
        // swap the '!' stage for a '?' stage, addressed by its label
        p.splice('excl', 1, splicer.obj([ suffix('?') ]));
        var sink = collect(true, function (rows) {
            try {
                assert.deepStrictEqual(rows, [ 'A?', 'B?' ]);
                resolve();
            } catch (err) { reject(err); }
        });
        p.pipe(sink);
        p.write('a');
        p.write('b');
        p.end();
    });
});

test('nested labelled pipeline is addressable', function () {
    // A stream passed directly after a label is labelled in place, so it can be
    // fetched back by name (an array of stages, by contrast, is wrapped in a new
    // labelled sub-pipeline — covered by the indexOf/get test above).
    var inner = splicer.obj([ upper() ]);
    var p = splicer.obj([ 'outer', inner ]);
    assert.strictEqual(p.get('outer'), inner);
    assert.strictEqual(p.get('outer').label, 'outer');
    assert.strictEqual(p.indexOf('outer'), 0);
});
