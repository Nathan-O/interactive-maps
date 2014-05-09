'use strict';

module.exports = {

	/**
	 * TileSet statuses
	 */
	tileSetStatus: {
		ok: 0,
		failed: 1
	},

	/**
	 * @desc Returns max zoom level based on image dimensions
	 * @param width {number} - image width
	 * @param height {number} - image height
	 * @param maxZoom {number} - max zoom level, to prevent generating too many levels for maps
	 * @returns {number} - max zoom level
	 */
	getMaxZoomLevel: function (width, height, maxZoom) {
		var size = Math.max(width, height);

		return Math.min(Math.ceil(Math.log(size) / Math.log(2)) - 8, maxZoom);
	},

	/**
	 * @desc Generates bucket name based on bucket prefix and map name
	 * @param {string} bucketPrefix
	 * @param {string} mapName
	 * @returns {string}
	 */
	getBucketName: function (bucketPrefix, mapName) {
		return encodeURIComponent(bucketPrefix + mapName.trim().replace(/[ \/]/g, '_'));
	},

	/**
	 * Extend first object with seconds object properties
	 * @param {object} object1
	 * @param {object} object2
	 */
	extendObject: function (object1, object2) {
		Object.keys(object2).forEach(function (key) {
			object1[key] = object2[key];
		});
	},

	/**
	 * Returns hrtime difference in milliseconds
	 * @param hrTimeDiff
	 * @returns {number}
	 */
	hrTimeToMilliseconds: function (hrTimeDiff) {
		return Math.ceil(hrTimeDiff[0] * 1000 + hrTimeDiff[1] * 1e-6);
	},

	/**
	 * @desc Returns a glob path to a folder
	 *
	 * @example base/0/0/0.png
	 * @example base/{0..4}/0/0.png
	 *
	 * @param {string} base path
	 * @param {number} min zoom level
	 * @param {number} max zoom level
	 * @param {string} postfix
	 * @returns {string}
	 */
	getGlob: function (base, min, max, postfix) {
		base = (base || '') + '/';


		if (min === max) {
			base += min;
		} else {
			base += '{' + min + '..' + max + '}';
		}

		if (postfix) {
			base = base + postfix;
		}

		return base;
	},

	/**
	 * @desc Converts zoom level{s} to its binary number
	 *
	 * @examples
	 * 1 -> 1
	 * 2 -> 2
	 * 4 -> 8
	 * 6 -> 32
	 * 1,2 -> 3
	 * 1,3 -> 7
	 *
	 * @param minZoom min zoom level
	 * @param maxZoom max zoom level
	 * @returns {number} integer that is a binary representation of a zoom level
	 */
	zoomLevelsToBin: function (minZoom, maxZoom) {
		var result = 0;

		//if both are zero then bin is also zero
		if (minZoom === 0 && maxZoom === 0) {
			result = 0;
		} else if (minZoom === maxZoom) {
			result += Math.pow(2, minZoom - 1);
		} else if (minZoom < maxZoom) {
			minZoom = Math.max(minZoom, 1);

			for (; minZoom <= maxZoom; minZoom++) {
				result += Math.pow(2, minZoom - 1);
			}
		}

		return result;
	},

	/**
	 * @desc Converts binary to max zoom level
	 *
	 * @examples
	 * bin  dec ->result (num.length - num.search(/1*$/))
	 * 1011 (11)-> 2  (4 - 2)
	 * 1001 (9) -> 1  (4 - 3)
	 * 1100 (12)-> 0  (4 - 4)
	 * 1111 (15)-> 4  (4 - 0)
	 *
	 * @param num integer that is a binary representation of a zoom level
	 * @returns {number} max zoom level that we can display
	 */
	binToMaxZoomLevel: function (num) {
		num = (num || 0).toString(2); //We need to convert it to binary first

		//asterisk is here as if there are 0 at the end I want it to equal to a string length
		return num.length - num.search(/1*$/);
	},

	/**
	 * @desc Generate response url
	 *
	 * @param req {object} - Request object
	 * @param path {string} - path to the resource
	 * @param id {string} - entity id
	 * @returns {string} - URL to the entity
	 */
	responseUrl: function (req, path, id) {
		return req.protocol + '://' + req.headers.host + path + '/' + id;
	},

	/**
	 * @desc Generates DFS image url
	 *
	 * @param dfsHost {string} - HTTP server hostname for DFS files
	 * @param path {string} - path to the resource
	 * @param image {string} - image name
	 * @returns {string} - URL to DFS stored image
	 */
	imageUrl: function(dfsHost, path, image) {
		return 'http://' + dfsHost + '/' + path + '/' + image;
	},

	/**
	 * @desc Get North-East corner of the image in LatLng coordinates
	 *
	 * A short technical description on how this is supposed to work:
	 * In a perfect world the earth will be flat rectangle, but unfortunately the world is not perfect.
	 * Any  point on map has two coordinates, latitude [-90..90] and longitude [-180..180]. Map's boundaries are
	 * represented by both the SouthWest and NorthEast corners of the image.
	 * To get these coordinates we:
	 *  - figure out the map size for this map level (equal to 2^(zoomLevel + 8) )
	 *  - tiling process places the image always on the lower-left corner of the map, that's why south and east are
	 *  always fixed to the lowest-left coordinates: (-90, -180)
	 *  - north and east coordinates are calculated by dividing the corresponding sizes to the ratio and compensating
	 *  for the negative coordinates
	 *
	 *
	 * @param width {number} image width
	 * @param height {number} image height
	 * @param maxZoom {number} maximum zoom level
	 * @returns {object} LatLng object
	 *
	 * @todo Fix this: Currently this does not work correctly for the Top boundary (North part calculation) in case the
	 * map is wider than taller because of the Mercator projection
	 *
	 */
	getMapBoundaries: function (width, height, maxZoom) {
		var size = Math.pow(2, maxZoom + 8),
			maxLat = 90,
			maxLon = 180;
		return {
			north: (height / (size / (maxLat * 2))) - maxLat,
			east: (width / (size / (maxLon * 2))) - maxLon,
			south: - maxLat,
			west: - maxLon
		};
	}
};
