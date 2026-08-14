'use strict';

// Zero-dependency test helpers built on Node's own stream module, replacing
// the through2/concat-stream dev deps the upstream suite used.

var Transform = require('stream').Transform;
var Writable = require('stream').Writable;

function makeThrough(objectMode) {
    return function (transform, flush) {
        if (typeof transform !== 'function') {
            transform = function (chunk, enc, next) { next(null, chunk); };
        }
        return new Transform({
            objectMode: objectMode,
            transform: transform,
            flush: flush
        });
    };
}

var through = makeThrough(false);
through.obj = makeThrough(true);

function concat(cb) {
    var chunks = [];
    return new Writable({
        write: function (chunk, enc, next) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            next();
        },
        final: function (next) {
            cb(Buffer.concat(chunks));
            next();
        }
    });
}

module.exports = { through: through, concat: concat };
