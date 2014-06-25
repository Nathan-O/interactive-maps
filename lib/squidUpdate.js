/**
 * Module to send logs to scribe
 */
'use strict';

var config = require('./config'),
	ScribeClass = require('scribe').Scribe,
	scribe,

	// "constants"
	scribeKey = 'varnish_purges';

/**
 * @desc Gets Scribe instance to use for sending log entries
 *
 * @returns {Scribe}
 */
function getScribe() {
	var scribeHost = config.scribeHost || '127.0.0.1',
		scribePort = config.scribePort || 1463;

	if( !scribe ) {
		scribe = new ScribeClass( scribeHost, scribePort );
	}

	return scribe;
}

/**
 * @desc Purges an URL
 *
 * @param {String} url
 * @param {String} caller
 */
function purgeUrl(url, caller) {
	var data = getDefaultData(caller);
	data.url = url;
	purge(data);
}

/**
 * @desc Purges objects by surrogate key
 *
 * @param {String} key surrogate key
 * @param {String} caller
 */
function purgeKey(key, caller) {
	var data = getDefaultData(caller);
	data.key = key;
	purge(data);
}

/**
 * @desc Returns default data to send to scribe
 *
 * @param {String} caller
 *
 * @returns {{time: *, method: *}}
 */
function getDefaultData(caller) {
	return {
		'time': Date.now(),
		'method': caller
	};
}

/**
 * @desc Sends log to scribe
 *
 * @param data
 */
function purge(data) {
	console.log( data );

	/*
	var scribeConnection = getScribe();
	scribeConnection.open(function(err) {
		if(err) {
			return console.log(err);
		}

		scribeConnection.send(scribeKey, JSON.stringify(data));
		scribeConnection.close();
	});
	*/
}

module.exports = {
	// varnish purging methods
	purgeUrl: purgeUrl,
	purgeKey: purgeKey
};
