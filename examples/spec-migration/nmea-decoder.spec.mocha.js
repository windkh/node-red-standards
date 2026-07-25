// BEFORE — mocha + chai (original ntrip spec)
'use strict';

const helper = require('node-red-node-test-helper');
const { expect } = require('chai');
const ntripModule = require('../ntrip/99-ntrip.js');

helper.init(require.resolve('node-red'));

const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';

describe('NmeaDecoder', function () {
    before(() => helper.startServer());
    after(() => helper.stopServer());
    afterEach(() => helper.unload());

    it('decodes a valid GGA sentence', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, [{ id: 'n1', type: 'NmeaDecoder', wires: [['ok'], ['err']] }, { id: 'ok', type: 'helper' }, { id: 'err', type: 'helper' }], () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                ok.on('input', (msg) => {
                    try {
                        expect(msg.payload.messageType).to.equal('GGA');
                        expect(msg.payload.nmeaMessage).to.have.property('latitude');
                        expect(Buffer.isBuffer(msg.payload.input)).to.equal(false);
                        expect(msg.payload.inputString).to.be.a('string');
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
