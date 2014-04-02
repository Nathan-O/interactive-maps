'use strict';

var proxyquire = require('proxyquire').noCallThru(),
	stubs = require('./stubs');

describe('Optimize tiles', function () {

	it('throws an error on incorrect data', function () {
		var optimizeTiles = proxyquire('../lib/optimizeTiles', {});
		expect(optimizeTiles()).toThrow(new Error('Required data not set'));
	});

	it('executes the tile optimization process', function () {
		var streamStub = new createSpyObj('stream', ['trim']),
			collector = stubs.newCollector(['run']),
			childProcessMock = {
				exec: function (cmd, cb) {
					collector.run(cmd);
					cb(streamStub, streamStub, streamStub);
				}
			},
			optimizeTiles = proxyquire('../lib/optimizeTiles', {
				child_process: childProcessMock,
				'./config': {
					optimize: true
				}
			}),
			data = {

			};

		optimizeTiles(data);

		expect(collector.run.callCount).toEqual(3);
		expect(streamStub.trim).toHaveBeenCalled();
	});
});
