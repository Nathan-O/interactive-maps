(function(window, L){
	'use strict';

	var mapContainerId = 'map',
		map;

	/**
	 * @desc Add point to the map
	 * @param point {object}
	 * @returns {object} Leaflet Marker
	 */
	function addPointOnMap(point) {
		var popupHtml = '<h3>' + point.title + '</h3>' +
			'<p>' +point.description + '</p>';
		return L.marker([ point.lat, point.lon ], {
			riseOnHover: true
		})
			.bindPopup(popupHtml)
			.addTo(map);
	}

	/**
	 * @desc Create new map and add points to it
	 * @param config {object}
	 */
	function createMap(config) {
		if (config.imagesPath) {
			L.Icon.Default.imagePath = config.imagePath;
		}
		map = L.map(mapContainerId)
			.setView([config.latitude, config.longitude], config.zoom);

		L.tileLayer(config.pathTemplate, config.mapSetup).addTo(map);

		config.points.forEach(function (point){
			addPointOnMap(point);
		});

	}

	createMap(window.mapSetup);

})(window, window.L);
