/**
 * Module to handle errors
 * Whichever module that calls next(err)
 * will end up here and a proper message will be send to a user
 *
 * err:
 * {
 *		status: {http status code}
 *		message: {any type of a message}
 * }
 */
'use strict';

var logger = require('./logger').getInstance();

module.exports = function errorHandler(err, req, res, next) {
	var status = err.status || 500;

	res.status(status);
	res.send(err.message);
	res.end();

	logger.debug(err.message, {
		response: status,
		url: req.url,
		method: req.method
	});
};
