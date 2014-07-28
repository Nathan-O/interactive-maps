'use strict';

var config = require('./config'),
	utils = require('./utils'),
	http = require('http'),
	jobs = require('kue').createQueue(config),
	dbCon = require('./db_connector'),
	exitCodes = {
		'OK': 0,
		'WARNING': 1,
		'CRITICAL': 2,
		'UNKNOWN': 3
	},
	heartBeatEntryPoint = 'heartbeat',
	heartBeatResponse = 'Server status is: OK',
	httpTimeout = 1000;

/**
 * @desc Generates check result based on threshold limits and value
 * @param {object} thresholds - Threshold table
 * @param {number} value - curernt value
 * @param {string} messageText - message text for the log
 * @returns {{code: number, message: string}}
 */
function getCheckResult(thresholds, value, messageText) {
	var resultCode = exitCodes.CRITICAL,
		limit;
	for (limit in thresholds) {
		if (value <= limit) {
			resultCode = thresholds[limit];
			break;
		}
	}
	return {
		code: resultCode,
		message: value + ' ' + messageText
	};
}

/**
 * @desc Sends simple DB query to check if DB is up
 *
 * @param {string} connectionType flag telling what connection to check master or slave
 * @param {object} res response object from express
 */
function getDbHeartbeat(connectionType, res) {
	dbCon.getConnection(
		connectionType,
		function (conn) {
			dbCon.knex.raw('select 1').connection(conn).then(function () {
				if (connectionType === dbCon.connType.master) {
					getDbHeartbeat(dbCon.connType.all, res);
				} else {
					res.status(200);
					res.send(heartBeatResponse);
				}
			});
		}, function() {
			res.status(503);
			res.send('Server status is: FAILED - database down');
		}
	);
}

/**
 * @desc Returns full url to server's heartbeat entry point
 * @returns {string}
 */
function getHeartbeatUrl(hostname) {
	return 'http://' + hostname + ':' + config.api.port + '/' + heartBeatEntryPoint;
}


module.exports = {
	exitCodes: exitCodes,

	/**
	 * @desc Gets the number of inactive queue tasks and callbacks with proper result
	 *
	 * @param {object} inactiveThresholds - object defining the threshold levels
	 * @param {function} callback - function to execute with the result object
	 */
	getQueueSize: function (inactiveThresholds, callback) {
		jobs.inactiveCount(function (err, val) {
			var result;
			if (err) {
				result = {
					code: exitCodes.UNKNOWN,
					message: err.message
				};
			} else {
				result = getCheckResult(
					inactiveThresholds,
					val,
					'inactive jobs in queue'
				);
			}
			callback(result);
		});
	},

	/**
	 * @desc Makes HTTP request to the heartbeat entry point and measures the response time
	 *
	 * @param {string} hostname - hostname to check
	 * @param {object} responseTimeThreshold - object defining the threshold levels
	 * @param {function} callback - function to execute with the result object
	 */
	getApiHeartbeat: function (hostname, responseTimeThreshold, callback) {
		var startTime = process.hrtime(),
			sent = false,
			executionTime,
			result;
		http.get(getHeartbeatUrl(hostname), function (res) {
			executionTime = process.hrtime(startTime);
			if (res.statusCode === 200) {
				result = getCheckResult(
					responseTimeThreshold,
					utils.hrTimeToMilliseconds(executionTime),
					'ms response time'
				);
			} else {
				result = {
					code: exitCodes.CRITICAL,
					message: 'HTTP Code ' + res.statusCode
				};
			}
			sent = true;
			callback(result);
		})
		.on('error', function (e) {
			result = {
				code: exitCodes.CRITICAL,
				message: e.message
			};
			callback(result);
		})
		.setTimeout(httpTimeout, function (res) {
			if (!sent) {
				result = {
					code: exitCodes.CRITICAL,
					message: 'Request timeout'
				};
				callback(result);
			}
		});
	},

	/**
	 * @desc Attaches heartBeat entry point
	 *
	 * @param {object} app - express.js app object
	 */
	heartBeatHandler: function (app) {
		app.get('/' + heartBeatEntryPoint, function (req, res) {
			getDbHeartbeat(dbCon.connType.master, res);
		});
	},

	/**
	 * @desc Outputs Nagios result message and exits with proper result code
	 *
	 * @param {object} result
	 */
	printResult: function (result) {
		console.log(result.message);
		process.exit(result.code);
	}
};
