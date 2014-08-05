'use strict';

require(
	['ponto', 'tracker', 'im.renderUI', 'im.i18n', 'im.utils', 'im.poi'],
	function (ponto, tracker, renderUI, i18n, utils, poi) {

		var L = window.L,

			doc = window.document,
			body = doc.body,

			mapContainerId = 'map',
			pointTypeFiltersContainerId = 'pointTypes',
			editPointTypesButtonId = 'editPointTypes',
			allPointTypesFilterId = 'allPointTypes',

			pontoBridgeModule = 'wikia.intMap.pontoBridge',

			uiControlsPosition = 'bottomright',

			wrapper = doc.getElementById('wrapper'),

		// leaflet map object
			map,
		// leaflet layer for storing markers
			markers = new L.LayerGroup(),
		// leaflet layer for drawing controls
			drawControls = new L.Control.Draw({
				position: uiControlsPosition,
				draw: {
					polyline: false,
					polygon: false,
					circle: false,
					rectangle: false
				}
			}),

			embedMapCodeButton,

		// constants
			popupWidthWithPhoto = 414,
			popupWidthWithoutPhoto = 314,
			mobilePopupWidth = 310,
			pointIconWidth = 30,
			pointIconHeight = 30,
			autoZoomPadding = 0.01,

			pointTypeFiltersContainer,
			pointIcons = {},
			pointCache = {},
			pointTypes = {},

			config = window.mapSetup,
			messages = config.i18n,

			editablePointTypes,
		// @todo Remove these once Ponto is fixed
			isWikiaSet = false,
			pontoTimeout = 500;

		/**
		 * @desc Setup icon for markers with given point type
		 * @param {object} pointType - POI type object
		 */
		function setupPointTypeIcon(pointType) {
			var pointTypeIcon;

			if (pointType.marker !== null) {
				pointTypeIcon = L.icon({
					iconUrl: pointType.marker,
					iconSize: [pointIconWidth, pointIconHeight]
				});
			} else {
				pointTypeIcon = new L.Icon.Default();
				// this is the nicest way to do that I found
				// we need to overwrite it here so in the filter box we have not broken image
				pointType.marker = pointTypeIcon._getIconUrl('icon');

				// we need this one for edit POI categories popup
				pointType.no_marker = true;
			}

			L.setOptions(pointTypeIcon, {
				className: 'point-type-' + pointType.id
			});

			pointIcons[pointType.id] = pointTypeIcon;
		}

		/**
		 * @desc Loads points of given type to cache and returns them
		 * @param {number} pointType - Id of point type, 0 for all types
		 * @returns {NodeList} - List of DOM elements corresponding with given point type
		 */
		function loadPointsToCache(pointType) {
			pointCache[pointType] = doc.querySelectorAll(
				(pointType === 0) ?
					'.leaflet-marker-icon, .leaflet-marker-shadow' :
					'.point-type-' + pointType
			);

			return pointCache[pointType];
		}

		/**
		 * @desc Deletes points from point cache
		 * @param {number} pointType - Id of point type
		 */
		function invalidatePointsCache(pointType) {
			delete pointCache[pointType];
		}

		/**
		 * @desc Return DOM elements for given point type
		 * @param {number} pointType - Id of point type, 0 for all types
		 * @returns {NodeList} - List of DOM elements corresponding with given point type
		 */
		function getPointsByType(pointType) {
			return (pointCache.hasOwnProperty(pointType)) ? pointCache[pointType] : loadPointsToCache(pointType);
		}

		/**
		 * @desc Toggles visibility of points corresponding with clicked filter
		 * @param {Element} filterClicked - Filter element that was clicked
		 */
		function togglePoints(filterClicked) {
			var pointType = parseInt(filterClicked.getAttribute('data-point-type'), 10),
				points = getPointsByType(pointType),
				pointsLength = points.length,
				i;

			for (i = 0; i < pointsLength; i++) {
				utils.toggleClass(points[i], 'hidden');
			}
		}

		/**
		 * @desc Toggles state of point type filter
		 * @param {Element} filterClicked - Filter element that was clicked
		 */
		function togglePointTypeFilter(filterClicked) {
			tracker.track(
				'map',
				tracker.ACTIONS.CLICK,
				'poi-category-filter',
				parseInt(filterClicked.getAttribute('data-point-type'), 10)
			);

			utils.toggleClass(filterClicked, 'enabled');
		}

		/**
		 * @desc Toggles state of "All pin types" filter
		 */
		function toggleAllPointTypesFilter() {
			var allPointTypesFilter = doc.getElementById(allPointTypesFilterId),
				enabled = 'enabled',
				filtersEnabledLength = pointTypeFiltersContainer.getElementsByClassName('point-type enabled').length;

			if (pointTypes.length === filtersEnabledLength &&
				allPointTypesFilter.className.indexOf(enabled) === -1){
				utils.addClass(allPointTypesFilter, enabled);
			} else {
				utils.removeClass(allPointTypesFilter, enabled);
			}

		}

		/**
		 * @desc Handles click on "All pin types" filter
		 */
		function allPointTypesFilterClickHandler() {
			var allPointTypesFilter = doc.getElementById(allPointTypesFilterId),
				filters = pointTypeFiltersContainer.getElementsByClassName('point-type'),
				filtersLength = filters.length,
				enabled = allPointTypesFilter.className.indexOf('enabled') === -1,
				i;

			for (i = 0; i < filtersLength; i++) {
				if (enabled) {
					utils.addClass(filters[i], 'enabled');
				} else {
					utils.removeClass(filters[i], 'enabled');
				}
			}

			toggleAllPointTypesFilter();
			togglePoints(allPointTypesFilter);

			tracker.track('map', tracker.ACTIONS.CLICK, 'poi-category-filter', 0);
		}

		/**
		 * @desc Handles click on point type filter
		 * @param {Element} filterClicked - Filter element that was clicked
		 */
		function pointTypeFilterClickHandler(filterClicked) {
			togglePointTypeFilter(filterClicked);
			toggleAllPointTypesFilter();
			togglePoints(filterClicked);
		}

		/**
		 * @desc Handles click on point type filters container
		 * @param {Event} event - Click event
		 */
		function pointTypeFiltersContainerClickHandler(event) {
			var elementClicked = event.target,
				filterClicked = elementClicked,
				pointType;

			if (elementClicked.parentNode.tagName === 'LI') {
				filterClicked = elementClicked.parentNode;
			}

			map.closePopup();

			pointType = parseInt(filterClicked.getAttribute('data-point-type'), 10);

			if (pointType === 0) {
				allPointTypesFilterClickHandler();
			} else {
				pointTypeFilterClickHandler(filterClicked);
			}
		}

		/**
		 * Create Point types filter container
		 * @param {object} container
		 * @param {boolean=} isExpanded - optional param for inital state of filter box if true it wil be expanded
		 * @returns {object}
		 */
		function createPointTypeFiltersContainer(container, isExpanded) {
			var div = doc.createElement('div'),
				header = doc.createElement('div'),
				headerTitle = doc.createElement('span'),
				headerEdit = doc.createElement('span'),
				ul = doc.createElement('ul'),
				li = doc.createElement('li');

			div.setAttribute('id', 'filterMenu');
			div.setAttribute('class', 'filter-menu ' + (isExpanded ? 'shown' : 'hidden') + '-box');

			header.setAttribute('class', 'filter-menu-header');

			headerTitle.appendChild(doc.createTextNode(i18n.msg(messages, 'wikia-interactive-maps-filters')));
			header.appendChild(headerTitle);

			headerEdit.setAttribute('id', editPointTypesButtonId);
			headerEdit.setAttribute('class', 'edit-point-types');
			headerEdit.appendChild(doc.createTextNode(i18n.msg(messages, 'wikia-interactive-maps-edit-pin-types')));
			header.appendChild(headerEdit);

			div.appendChild(header);

			ul.setAttribute('id', pointTypeFiltersContainerId);
			ul.setAttribute('class', 'point-types');

			li.setAttribute('id', 'allPointTypes');
			li.setAttribute('class', 'enabled');
			li.setAttribute('data-point-type', '0');
			li.appendChild(doc.createTextNode(i18n.msg(messages, 'wikia-interactive-maps-all-pin-types')));
			ul.appendChild(li);
			div.appendChild(ul);
			container.appendChild(div);
			return ul;
		}

		/**
		 * @desc Create points and filters for them
		 */
		function setupPoints(types, isExpanded) {
			var pointTypeFiltersHtml = '';

			pointTypes = types;

			pointTypes.forEach(function (pointType) {
				setupPointTypeIcon(pointType);
				pointTypeFiltersHtml += renderUI.buildPointTypeFilterHtml(pointType);
			});

			pointTypeFiltersContainer = createPointTypeFiltersContainer(wrapper, isExpanded);
			pointTypeFiltersContainer.innerHTML += pointTypeFiltersHtml;

			config.points.forEach(function(point) {
				poi.addPoiToMap(point, pointIcons[point.poi_category_id], markers);
			});

			pointTypeFiltersContainer.addEventListener('click', pointTypeFiltersContainerClickHandler, false);
			document.querySelector('.filter-menu-header').addEventListener('click', handleBoxHeaderClick);
		}

		/**
		 * @desc sends data to Wikia Client via ponto to add / edit POI
		 * @param {object} marker - marker object
		 */
		function editMarker(marker) {
			var params = {
				action: 'editPOI',
				data: marker.point
			};

			params.data.mapId = config.id;
			params.data.categories = config.types;

			invalidatePointsCache(marker.point.poi_category_id);

			ponto.invoke(pontoBridgeModule, 'processData', params, function (point) {
				var markerObject,
					filter;

				// removes old marker from layer group
				if (markers.hasLayer(marker)) {
					markers.removeLayer(marker);
				}
				// adds new marker to layer group
				if (point) {
					invalidatePointsCache(point.poi_category_id);
					markerObject = poi.addPoiToMap(point, pointIcons[point.poi_category_id], markers);

					filter = pointTypeFiltersContainer.querySelector('[data-point-type="' + point.poi_category_id + '"]');
					if (filter.className.indexOf('enabled') !== -1) {
						markerObject.openPopup();
					} else {
						utils.addClass(markerObject._icon, 'hidden');
						utils.addClass(markerObject._shadow, 'hidden');
					}
				}
			}, showPontoError, true);
		}

		/**
		 * @desc Expands / folds the filter box
		 * @param {HTMLElement} filterBox
		 */
		function toggleFilterBox(filterBox) {
			utils.toggleClass(filterBox, 'shown-box');
			utils.toggleClass(filterBox, 'hidden-box');
		}

		/**
		 * @desc Handles click event on the filterBox header
		 * @param {event} event
		 */
		function handleBoxHeaderClick(event) {
			if (event.target.id !== editPointTypesButtonId) {
				var filterBox = event.currentTarget.parentElement;
				toggleFilterBox(filterBox);
			}
		}

		/**
		 * Filters out POI types that should not be edited and caches the result
		 * uses editablePinTypes for caching
		 * @param {array} types
		 * @returns {array}
		 */
		function getEditablePointTypes(types) {
			return (editablePointTypes) ?
				editablePointTypes :
				editablePointTypes = types.filter(function (type) {
					return type.id !== config.catchAllCategoryId;
				});
		}

		/**
		 * @desc invokes Wikia Client edit POI category action
		 */
		function editPointTypes() {
			var params = {
				action: 'poiCategories',
				data: {
					mapId: config.id,
					poiCategories: getEditablePointTypes(config.types),
					mode: 'edit'
				}
			};

			ponto.invoke(pontoBridgeModule, 'processData', params, function (types) {
				wrapper.removeChild(doc.getElementById('filterMenu'));
				map.removeLayer(markers);

				markers = new L.LayerGroup();
				setupPoints(types, true);
				markers.addTo(map);

			}, showPontoError, true);
		}

		/**
		 * @desc shows error message for ponto communication
		 * @param {string} message - error message
		 * @todo figure out were to display them
		 */
		function showPontoError(message) {
			if (window.console) {
				window.console.error('Ponto Error', message);
			}
		}

		/**
		 * @desc This is temporary function to handle Ponto, not error-ing when there is no Ponto on the other side
		 * @todo Remove this once Ponto errors on missing pair
		 */
		function setupPontoTimeout() {
			setTimeout(function () {
				if (!isWikiaSet) {
					setUpHideButton();
					showAttributionStripe();
				}
			}, pontoTimeout);
		}

		/**
		 * @desc setup Ponto communication for Wikia Client
		 */
		function setupPontoWikiaClient() {
			if (window.self !== window.top) {
				ponto.setTarget(ponto.TARGET_IFRAME_PARENT, '*');
				ponto.invoke(pontoBridgeModule, 'getWikiaSettings', null, setupWikiaOnlyOptions, showPontoError, false);
				setupPontoTimeout();
			} else {
				showAttributionStripe();
				tracker.track('map', tracker.ACTIONS.IMPRESSION, 'embedded-map-displayed',
					parseInt(config.id, 10));
			}
		}

		function showAttributionStripe() {
			var doc = window.document;
			utils.addClass(doc.getElementById('wrapper'), 'embed');
			utils.addClass(doc.getElementById('attr'), 'embed');
		}

		/**
		 * @desc setup map options available only when map displayed on Wikia page
		 * @param {object} options - {enableEdit: bool, skin: string}
		 */
		function setupWikiaOnlyOptions(options) {
			// @todo Remove this, once Ponto errors on missing pair
			isWikiaSet = true;

			if (options.enableEdit) {
				setUpEditOptions();
			}
			if (options.skin === 'wikiamobile') {
				utils.addClass(body, 'wikia-mobile');
				setUpHideButton();
			} else {
				toggleFilterBox(doc.querySelector('.filter-menu'));
			}
		}

		/**
		 * @desc adds hide button when on wikia mobile or embed code
		 */
		function setUpHideButton() {
			var hide = document.createElement('a');
			hide.innerHTML = i18n.msg(messages, 'wikia-interactive-maps-hide-filter');
			hide.className = 'hide-button';
			document.querySelector('.filter-menu-header').appendChild(hide);
		}

		/**
		 * @desc setup edit options
		 */
		function setUpEditOptions() {
			// add POI handler
			map.on('draw:created', function (event) {
				editMarker(poi.createTempPoiMarker(event));
			});

			// edit POI handler
			wrapper.addEventListener('click', function (event) {
				var target = event.target;

				if (target.className.indexOf('edit-poi-link') !== -1) {
					event.preventDefault();
					editMarker(poi.getPoiMarker(target.getAttribute('data-marker-id')));
				}

				if (target.id === editPointTypesButtonId) {
					editPointTypes();
				}
			}, false);

			// show edit UI elements
			utils.addClass(body, 'enable-edit');
			map.addControl(drawControls);
			map.addControl(embedMapCodeButton);
			tracker.track('map', tracker.ACTIONS.IMPRESSION, 'wikia-map-displayed', parseInt(config.id, 10));
		}

		/**
		 * @desc sends data to Wikia Client via ponto to show embed map code modal
		 */
		function embedMapCode() {
			var params = {
				action: 'embedMapCode',
				data: {
					mapId: config.id,
					iframeSrc: config.iframeSrc
				}
			};

			ponto.invoke(pontoBridgeModule, 'processData', params, null, showPontoError, true);
		}

		/**
		 * @desc Sets up the interface translations
		 */
		function setupInterfaceTranslations() {
			L.drawLocal.draw.handlers.marker.tooltip.start = i18n.msg(messages,
				'wikia-interactive-maps-create-marker-handler');
			L.drawLocal.draw.toolbar.buttons.marker = i18n.msg(messages, 'wikia-interactive-maps-create-marker-tooltip');
			L.drawLocal.draw.toolbar.actions.text = i18n.msg(messages, 'wikia-interactive-maps-create-marker-cancel');
		}

		/**
		 * @desc Sets up click tracking for service
		 */
		function setupClickTracking() {
			map.on('popupopen', function () {
				tracker.track('map', tracker.ACTIONS.CLICK_LINK_IMAGE, 'poi');
			});

			doc.addEventListener('click', function (event) {
				if (event.target.className.indexOf('poi-article-link') !== -1) {
					tracker.track('map', tracker.ACTIONS.CLICK_LINK_TEXT, 'poi-article');
				}
			});
		}

		/**
		 * @desc helper function that checks if the size of the screen smaller then popup size
		 * @TODO temporary fix to be removed ones mobile UI for map will be properly designed
		 * @returns {boolean}
		 */
		function isMobileScreenSize() {
			return window.outerWidth < 430 || (window.outerHeight < 430 && window.outerHeight < window.outerWidth);
		}

		/**
		 * @desc Create new map
		 */
		function createMap() {
			var zoomControl,
				defaultMinZoom,
				zoom,
				mapBounds,
				pointsList;

			setupInterfaceTranslations();

			defaultMinZoom = utils.getMinZoomLevel(
				config.layer.maxZoom,
				Math.max(config.width, config.height),
				Math.max(
					Math.max(doc.documentElement.clientWidth, window.innerWidth || 0),
					Math.max(doc.documentElement.clientHeight, window.innerHeight || 0)
				)
			);

			if (config.imagesPath) {
				L.Icon.Default.imagePath = config.imagesPath;
			}

			map = L.map(mapContainerId, {
				minZoom: config.layer.minZoom,
				maxZoom: config.layer.maxZoom,
				zoomControl: false
			});

			map.attributionControl.setPrefix(false);

			if (config.hasOwnProperty('boundaries')) {
				mapBounds = new L.LatLngBounds(
					L.latLng(config.boundaries.south, config.boundaries.west),
					L.latLng(config.boundaries.north, config.boundaries.east)
				);

				map.setMaxBounds(mapBounds);
				map.on('popupclose', function () {
					map.panInsideBounds(mapBounds);
				});
				config.layer.bounds = mapBounds;
			}

			L.tileLayer(config.pathTemplate, config.layer).addTo(map);

			zoom = Math.max(config.zoom, defaultMinZoom);
			if (config.type !== 'custom') {
				zoom = config.defaultZoomForRealMap;
			}
			map.setView(
				L.latLng(config.latitude, config.longitude),
				zoom
			);

			zoomControl = L.control.zoom({
				position: uiControlsPosition
			});

			embedMapCodeButton = new L.Control.EmbedMapCode({
				position: uiControlsPosition,
				//TODO fix icon
				title: '< >',
				onClick: embedMapCode
			});

			map.addControl(zoomControl);

			// Change popup size for small mobile screens
			if (isMobileScreenSize()) {
				popupWidthWithPhoto = mobilePopupWidth;
				popupWidthWithoutPhoto = mobilePopupWidth;
			}

			setupPontoWikiaClient();
			setupPoints(config.types);
			setupClickTracking();
			markers.addTo(map);

			// Collect all the markers from the markers layer
			pointsList = Object.keys(markers._layers).map(function (k) {
				return markers._layers[k];
			});

			if (pointsList.length > 0) {
				// This is called as async because leaflet freezes when map.fitBounds is called directly
				setTimeout(function () {
					var group = new L.featureGroup(pointsList);
					map.fitBounds(group.getBounds().pad(autoZoomPadding));
				}, 1);
			}

			// Workaround for Safari translate3D bug with map panning and popups set to 'keep in view'
			L.Browser.webkit3d = false;
		}

		createMap();
	}
);
