'use strict';

var proxyquire = require('proxyquire').noCallThru(),
	errorHandler = proxyquire('../lib/errorHandler', {
		'./logger': {
			error: function () {

			},
			getContext: function (status, req) {
				return {
					status: status,
					req: req
				};
			}
		}
	}),
	stubReq = function () {
		return {};
	},
	stubRes = function (status, message) {
		return {
			status: function (resStatus) {
				expect(status).toEqual(resStatus);
			},
			send: function (resMessage) {
				expect(message).toEqual(resMessage);
			},
			end: function () {

			}
		};
	},
	stubErr = function (status, message) {
		return {
			status: status,
			message: message
		};
	};

describe('errorHandler module', function () {
	it('should response with appropriate status end message', function () {
		errorHandler(
			stubErr(400, 'error'),
			stubReq(),
			stubRes(400, 'error')
		);

		errorHandler(
			stubErr(502, 'error1'),
			stubReq(),
			stubRes(502, 'error1')
		);

		errorHandler(
			stubErr(404, 'error2'),
			stubReq(),
			stubRes(404, 'error2')
		);
	});

	it('should use status 500 by default', function () {
		errorHandler(
			stubErr(undefined, 'error'),
			stubReq(),
			stubRes(500, 'error')
		);
	});

	it('should log the error', function () {
		var error = jasmine.createSpy('error'),
			errorHandler = proxyquire('../lib/errorHandler', {
				'./logger': {
					error: error,
					getContext: function (status, req) {
						return {
							status: status,
							req: req
						};
					}
				}
			});

		errorHandler(
			stubErr(418, 'I\'m a teapot'),
			stubReq(),
			stubRes(418, 'I\'m a teapot')
		);

		expect(error).toHaveBeenCalled();
		expect(error.calls.count()).toEqual(1);
		expect(error).toHaveBeenCalledWith('I\'m a teapot', {
			status: 418,
			req: {}
		});

		errorHandler(
			stubErr(404, 'Not found'),
			stubReq(),
			stubRes(404, 'Not found')
		);

		expect(error.calls.count()).toEqual(2);
		expect(error).toHaveBeenCalledWith('Not found', {
			status: 404,
			req: {}
		});
	});
});
