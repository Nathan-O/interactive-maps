'use strict';

var proxyquire = require('proxyquire').noCallThru(),
	dbConStub = {},
	errorHandlerStub = {},
	utilsStub = {
		responseUrl: function () {
			return 'mocked response URL';
		},
		addTrailingSlash: function () {}
	},
	qStub = {},
	configStub = {},
	poiConfigStub = {},
	crudUtilsStub = {},
	poiCategoryConfig = require('../api/v1/poi_category.config');

function getPoiCategoryUtilsMock(
	dbConStub,
	errorHandlerStub,
	utilsStub,
	qStub,
	configStub,
	poiConfigStub,
	crudUtilsStub
	) {
		return proxyquire('../api/v1/poi_category.utils', {
			'./../../lib/db_connector': dbConStub,
			'./../../lib/errorHandler': errorHandlerStub,
			'./../../lib/utils': utilsStub,
			'q': qStub,
			'./../../lib/config': configStub,
			'./poi.config': poiConfigStub,
			'./crud.utils': crudUtilsStub
		});
}

describe('poi_category.utils.js', function () {
	it('returns correct object with setupCreatePoiCategoryResponse()', function () {
		var reqStub = {
				route: {
					path: '/'
				}
			},
			poiCategoryUtils = getPoiCategoryUtilsMock(
				dbConStub,
				errorHandlerStub,
				utilsStub, qStub,
				configStub,
				poiConfigStub,
				crudUtilsStub
			);
		expect(poiCategoryUtils.setupCreatePoiCategoryResponse(123, reqStub)).toEqual({
			message: poiCategoryConfig.responseMessages.created,
			id: 123,
			url: 'mocked response URL'
		});
	});

	it('returns correct value for different scenarios in isDeletedCategoryUsed()', function () {
		var testsSet = [{
				errorStub: new Error('Just an error'),
				errorHandlerStub: {
					isHandledSQLError: function () {
						return false;
					}
				},
				expected: false
			}, {
				errorStub: {
					clientError: 'An error'
				},
				errorHandlerStub: {
					isHandledSQLError: function () {
						return false;
					}
				},
				expected: false
			}, {
				errorStub: {
					clientError: {
						name: 'An error'
					}
				},
				errorHandlerStub: {
					isHandledSQLError: function () {
						return false;
					}
				},
				expected: false
			}, {
				errorStub: {
					clientError: {
						name: 'An error'
					}
				},
				errorHandlerStub: {
					isHandledSQLError: function () {
						return false;
					}
				},
				expected: false
			}, {
				errorStub: {
					clientError: {
						name: 'An error',
						cause: {
							code: 'ER_ROW_IS_REFERENCED_'
						}
					}
				},
				errorHandlerStub: {
					isHandledSQLError: function () {
						return true;
					}
				},
				expected: true
			}];

		testsSet.forEach(function (testCase) {
			var poiCategoryUtils = getPoiCategoryUtilsMock(
				dbConStub,
				testCase.errorHandlerStub,
				utilsStub,
				qStub,
				configStub,
				poiConfigStub,
				crudUtilsStub
			);
			expect(poiCategoryUtils.isDeletedCategoryUsed(testCase.errorStub)).toBe(testCase.expected);
		});
	});
});
