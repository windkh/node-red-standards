// AFTER — node:test + node:assert (target). Same structure, only imports + assertions changed.
'use strict';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const helper = require('node-red-node-test-helper');
const ntripModule = require('../ntrip/99-ntrip.js');

helper.init(require.resolve('node-red'));

const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';

describe('NmeaDecoder', () => {
    before(() => helper.startServer());
    after(() => helper.stopServer());
    afterEach(() => helper.unload());

    it('decodes a valid GGA sentence', () => {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, [{ id: 'n1', type: 'NmeaDecoder', wires: [['ok'], ['err']] }, { id: 'ok', type: 'helper' }, { id: 'err', type: 'helper' }], () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                ok.on('input', (msg) => {
                    try {
                        assert.strictEqual(msg.payload.messageType, 'GGA');
                        assert.ok(Object.prototype.hasOwnProperty.call(msg.payload.nmeaMessage, 'latitude'));
                        assert.strictEqual(Buffer.isBuffer(msg.payload.input), false);
                        assert.strictEqual(typeof msg.payload.inputString, 'string');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: GGA });
            });
        });
    });
});
