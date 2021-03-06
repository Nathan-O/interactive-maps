/* global jasmine */
'use strict';

describe('Health Check', function () {

	var proxyquire = require('proxyquire').noCallThru(),
		error = null,
		queueSize = 20,
		healthCheck = proxyquire('./../lib/healthCheck', {
			'./config': {
				api: {
					port: 1
				}
			},
			'./db_connector': {},
			'kue': {
				createQueue: function () {
					return {
						inactiveCount: function (callback) {
							callback(error, queueSize);
						}
					};
				}
			},
			http: {
				get: function (url, ok) {
					var timeout = function (ms, callback) {
						callback();
					};
					ok({
						statusCode: 200
					});
					return {
						on: function () {
							return {
								setTimeout: timeout
							};
						},
						setTimeout: timeout
					};
				}
			},
			'./utils': {
				hrTimeToMilliseconds: function (hrTimeDiff) {
					return Math.ceil(hrTimeDiff[0] * 1000 + hrTimeDiff[1] * 1e-6);
				}
			}
		});

	it('is module', function () {
		expect(typeof healthCheck).toBe('object');
		expect(healthCheck).toBeDefined();
	});

	it('exports exit codes', function () {
		expect(typeof healthCheck.exitCodes).toBe('object');
	});

	it('returns proper queue result code depending on the thresholds', function () {
		var testCases = [{
			thresholds: {
				20: healthCheck.exitCodes.OK
			},
			expectedCode: healthCheck.exitCodes.OK
		}, {
			thresholds: {
				10: healthCheck.exitCodes.OK,
				20: healthCheck.exitCodes.WARNING
			},
			expectedCode: healthCheck.exitCodes.WARNING
		}, {
			thresholds: {
				5: healthCheck.exitCodes.OK,
				10: healthCheck.exitCodes.WARNING,
				20: healthCheck.exitCodes.CRITICAL
			},
			expectedCode: healthCheck.exitCodes.CRITICAL
		}];
		testCases.forEach(function (testCase) {
			healthCheck.getQueueSize(
				testCase.thresholds,
				function (result) {
					expect(result.code).toBe(testCase.expectedCode);
				}
			);
		});
	});

	it('returns unknown status and proper message if error arises in queue', function () {
		error = {
			message: 'You shall not pass'
		};
		healthCheck.getQueueSize({},
			function (result) {
				expect(result.code).toBe(healthCheck.exitCodes.UNKNOWN);
				expect(result.message).toBe(error.message);
			}
		);
	});

	it('returns normal heartbeat result', function () {
		var callback = jasmine.createSpy('callback'),
			thresholds = {
				20: healthCheck.exitCodes.OK
			};
		healthCheck.getApiHeartbeat('localhost', thresholds, callback);
		expect(callback).toHaveBeenCalledWith({
			code: 0,
			message: '1 ms response time'
		});
		expect(callback.calls.length).toEqual(1);
	});
});
