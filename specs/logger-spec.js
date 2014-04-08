describe('Logger module', function () {
	var proxyquire = require('proxyquire'),
		logger = proxyquire('./../lib/logger.js', {
			'fs': {
				createWriteStream: createWriteStream
			},
			'node-syslog': {
				init: function () {
					counter++;
				},
				log: function () {
					counter++;
				}
			}
		}),
		counter = 0,
		consoleLog = console.log;

	console.log = function (message) {
		counter++;
	};

	function createWriteStream(path) {
		counter++;
		return {
			path: path,
			write: function (message) {
				counter++
			},
			end: function () {}
		};
	}

	it('should exist', function () {
		expect(logger).toBeDefined();
	});

	it('should have all the methods defined', function () {
		expect(typeof logger.debug).toBe('function');
		expect(typeof logger.info).toBe('function');
		expect(typeof logger.notice).toBe('function');
		expect(typeof logger.warning).toBe('function');
		expect(typeof logger.error).toBe('function');
		expect(typeof logger.critical).toBe('function');
		expect(typeof logger.alert).toBe('function');
		expect(typeof logger.emergency).toBe('function');
		expect(typeof logger.reset).toBe('function');
		expect(typeof logger.set).toBe('function');
		expect(typeof logger.close).toBe('function');
	});

	it('should export severity levels', function () {
		expect(typeof logger.level.DEBUG).toBe('number');
		expect(typeof logger.level.INFO).toBe('number');
		expect(typeof logger.level.NOTICE).toBe('number');
		expect(typeof logger.level.WARNING).toBe('number');
		expect(typeof logger.level.ERROR).toBe('number');
		expect(typeof logger.level.CRITICAL).toBe('number');
		expect(typeof logger.level.ALERT).toBe('number');
		expect(typeof logger.level.EMERGENCY).toBe('number');
	});

	it('Should use console.log when it has console transport set', function () {
		spyOn(console, 'log');
		logger.set({
			console: {
				enabled: true,
				level: logger.level.DEBUG,
				raw: true
			}
		});
		logger.debug('Console test');
		logger.close();
		expect(console.log).toHaveBeenCalledWith('[DEBUG] "Console test"');
	});

	it('Should filter unwanted severity levels', function () {
		spyOn(console, 'log');
		logger.set({
			console: {
				enabled: true,
				level: logger.level.INFO
			}
		});
		logger.debug('Console test');
		logger.close();
		expect(console.log).not.toHaveBeenCalled();
	});

	it('Should open and write to stream (2 ops) when logging to a local file', function () {
		counter = 0;

		logger.set({
			file: {
				enabled: true,
				level: logger.level.DEBUG,
				path: 'test.log'
			}
		});
		logger.debug('Testing');
		logger.close();

		expect(counter).toEqual(2);
	});

	it('Should open syslog connection and write to it (2 ops) when syslog enabled', function () {
		counter = 0;

		logger.set({
			syslog: {
				enabled: true,
				level: logger.level.DEBUG
			}
		});
		logger.debug('Testing');
		logger.close();

		expect(counter).toEqual(2);
	});

	it('should expose getContext method', function () {
		expect(logger.getContext).toBeDefined();
		expect(typeof logger.getContext).toBe('function');
	});

	it('getContext should return context', function () {
		expect(logger.getContext(200, {
			url: 'url',
			method: 'GET'
		})).toEqual({
			response: 200,
			url: 'url',
			method: 'GET'
		});

		expect(logger.getContext(200, {
			url: 'url',
			method: 'POST'
		})).toEqual({
			response: 200,
			url: 'url',
			method: 'POST'
		});

		expect(logger.getContext(200, {
			url: 'url2',
			method: 'GET'
		})).toEqual({
			response: 200,
			url: 'url2',
			method: 'GET'
		});

		expect(logger.getContext(400, {
			url: 'url3',
			method: 'POST'
		})).toEqual({
			response: 400,
			url: 'url3',
			method: 'POST'
		});

		expect(logger.getContext(600, {
			url: 'url4',
			method: 'PUT'
		})).toEqual({
			response: 600,
			url: 'url4',
			method: 'PUT'
		});
	});

	console.log = consoleLog;

});
