/**
 * Created by artem on 5/28/15.
 */
(function (angular) {
    'use strict';
    angular.module('LogicifyGMap', []);
})(angular);
/**
 * Created by artem on 10/16/15.
 */
(function (angular) {
    'use strict';
    /*global google*/
    angular.module('LogicifyGMap')
        .directive('logicifyGmapDraw', [
            '$timeout',
            '$log',
            '$q',
            '$compile',
            function ($timeout, $log, $q, $compile) {
                return {
                    restrict: 'E',
                    require: '^logicifyGmap',
                    scope: {
                        gmapEvents: '&gmapEvents',
                        drawOptions: '&drawOptions',
                        gmapCustomLines: '&gmapCustomLines',
                        gmapLineTypes: '=gmapLineTypes'
                    },
                    link: function (scope, element, attrs, ctrl) {
                        if (google.maps.drawing == null || google.maps.drawing.DrawingManager == null) {
                            throw new Error('"Drawing" API of google maps is not available! Probably you forgot load it. Please check google maps spec. to load "Drawing" API.');
                        }
                        var map = ctrl.getMap(),
                            events = scope.gmapEvents(),
                            drawManagerListeners = [],
                            overlaysListeners = [],
                            isLineTypesEnabled = scope.gmapCustomLines();
                        scope.gmapLineStyles = scope.gmapLineStyles || {};
                        var lines = {
                            dashed: {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 1
                            },
                            arrow: {
                                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                strokeOpacity: 1
                            },
                            dotted: {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 1,
                                strokeWeight: 4,
                                scale: 0.2
                            }
                        };

                        scope.polyLineTypes = [
                            {
                                name: '-----',
                                icons: [],
                                parentOptions: {
                                    strokeOpacity: 1
                                }
                            },
                            {
                                name: '---->',
                                icons: [{icon: lines.arrow, offset: '100%', repeat: 'none'}],
                                parentOptions: {
                                    strokeOpacity: 1
                                }
                            },
                            {
                                name: '· · · ·',
                                icons: [{icon: lines.dotted, offset: '0', repeat: '20px'}],
                                parentOptions: {
                                    strokeOpacity: 0
                                }
                            },
                            {
                                name: '- - - -',
                                icons: [{icon: lines.dashed, offset: '0', repeat: '20px'}],
                                parentOptions: {
                                    strokeOpacity: 0
                                }
                            },
                            {
                                name: '· · ·>',
                                icons: [
                                    {icon: lines.arrow, offset: '100%', repeat: 'none'},
                                    {icon: lines.dotted, offset: '0', repeat: '20px'}
                                ],
                                parentOptions: {
                                    strokeOpacity: 0
                                }
                            },
                            {
                                name: '- - ->',
                                icons: [
                                    {icon: lines.arrow, offset: '100%', repeat: 'none'},
                                    {icon: lines.dashed, offset: '0', repeat: '20px'}
                                ],
                                parentOptions: {
                                    strokeOpacity: 0
                                }

                            }
                        ];
                        if (Array.isArray(scope.gmapLineTypes)) {
                            scope.gmapLineTypes = scope.polyLineTypes.concat(scope.gmapLineTypes);
                            scope.polyLineTypes = scope.gmapLineTypes;
                        }
                        scope.currentLineType = scope.polyLineTypes[0];
                        function assignListener(listener, eventName) {
                            return google.maps.event.addListener(drawManager, eventName, listener);
                        }

                        function assignOverlayListeners(overlay) {
                            if (events && events.overlays) {
                                angular.forEach(events.overlays, function (listener, eventName) {
                                    if (typeof listener === 'function') {
                                        overlaysListeners.push(google.maps.event.addListener(overlay, eventName, function (e) {
                                            var self = this;
                                            listener.apply(self, [e, map]);
                                        }));
                                    }
                                });
                            }
                        }

                        function customStyling(overlay, type) {
                            if (isLineTypesEnabled === true && type !== 'marker' && type !== 'circle') {
                                var points = null;
                                if (type !== 'polyline') {
                                    switch (type) {
                                        case 'polygon':
                                            points = overlay.getPath().getArray();
                                            points.push(points[0]);//circular
                                            break;
                                        case 'rectangle':
                                            var NE = overlay.bounds.getNorthEast();
                                            var SW = overlay.bounds.getSouthWest();
                                            var SE = new google.maps.LatLng(NE.lat(), SW.lng());
                                            var NW = new google.maps.LatLng(SW.lat(), NE.lng());
                                            points = [NE, SE, SW, NW, NE];
                                            break;
                                    }
                                    var polyLine = new google.maps.Polyline({
                                        path: points
                                    });
                                    polyLine.set('icons', scope.currentLineType.icons);
                                    polyLine.setOptions(scope.currentLineType.parentOptions);//hide border
                                    overlay.setOptions(scope.currentLineType.parentOptions);//hide border
                                    polyLine.setMap(map);
                                } else {
                                    overlay.set('icons', scope.currentLineType.icons);
                                    overlay.setOptions(scope.currentLineType.parentOptions);
                                }
                            }
                        }

                        function detachListener(listener) {
                            if (google && google.maps) {
                                google.maps.event.removeListener(listener);
                            }
                        }

                        scope.$on('$destroy', function () {
                            /**
                             * Cleanup
                             */
                            drawManagerListeners.forEach(detachListener);
                            overlaysListeners.forEach(detachListener)
                        });
                        var minimalOptions = {
                            drawingMode: google.maps.drawing.OverlayType.MARKER,
                            drawingControl: true,
                            drawingControlOptions: {
                                position: google.maps.ControlPosition.TOP_CENTER,
                                drawingModes: [
                                    google.maps.drawing.OverlayType.MARKER
                                ]
                            }
                        };
                        var options = angular.extend(minimalOptions, scope.drawOptions());
                        var drawManager = new google.maps.drawing.DrawingManager(options);
                        drawManager.setMap(map);
                        var control = null;
                        if (isLineTypesEnabled === true) {
                            scope.onSelectPolyLineType = function (item) {
                                scope.currentLineType = item;
                            };
                            control = angular.element('<div gmap-dropdown gmap-dropdown-items="polyLineTypes" on-dropdown-select-item="onSelectPolyLineType"></div>');
                            $compile(control)(scope);
                        }
                        map.controls[google.maps.ControlPosition.TOP_CENTER].push(control[0]);
                        if (events) {
                            if (events.drawing) {
                                angular.forEach(events.drawing, function (liestener, eventName) {
                                    if (typeof liestener === 'function') {
                                        drawManagerListeners.push(assignListener(liestener, eventName));
                                    }
                                });
                            }
                            if (events.overlays) {
                                drawManagerListeners.push(google.maps.event.addListener(drawManager, 'overlaycomplete', function (e) {
                                    assignOverlayListeners(e.overlay);
                                    customStyling(e.overlay, e.type);
                                }))
                            }
                        }
                    }
                }
            }
        ]);
})(angular);
/**
 * Created by artem on 10/20/15.
 */
(function (angular) {
    angular.module('LogicifyGMap')
        .directive('gmapDropdown', [
            '$compile',
            function ($compile) {
                /**
                 * Create styling once
                 * @type {HTMLElement}
                 */
                return {
                    restrict: 'EA',
                    link: function (scope, element, attrs, ctrl) {
                        scope.dropDownItems = scope.$eval(attrs['gmapDropdownItems']) || [];
                        scope.onItemSelected = scope.$eval(attrs['onDropdownSelectItem']);
                        scope.current = scope.dropDownItems[0];
                        scope.onSelectItemLocally = function (item) {
                            if (typeof scope.onItemSelected === 'function') {
                                scope.onItemSelected(item);
                            }
                            scope.current = item;
                        };
                        element.addClass('gmap-dropdown-holder');
                        element[0].innerHTML = '<nav class="gmap-nav">' +
                        '<ul><li><a ng-bind="current.name||current"></a><ul>' +
                        '<li ng-repeat="item in dropDownItems" ng-click="onSelectItemLocally(item)"><a ng-bind="item.name || item"></a></li>' +
                        '</ul></ul></nav>';
                        $compile(element.contents())(scope);
                    }
                }
            }
        ]);
})(angular);
/**
 * Created by artem on 6/24/15.
 */
(function (google, angular) {
    'use strict';
    /**
     * Note that if you want custom X button for info window you need to add css
     * .gm-style-iw+div{ display:none }
     * where .gm-style-iw is a class of container element, and next div is close button
     */
    angular.module('LogicifyGMap')
        .directive('logicifyGmapControl',
        [
            '$compile',
            '$log',
            '$timeout',
            function ($compile, $log, $timeout) {
                return {
                    restrict: 'E',
                    require: '^logicifyGmap',
                    scope: {
                        controlPosition: '&controlPosition',
                        controlIndex: '&controlIndex',
                        events: '&events'
                    },
                    link: function (scope, iElement, iAttrs, ctrl) {
                        /*global google*/
                        var position = scope.controlPosition(),
                            index = scope.controlIndex(),
                            events = scope.events(),
                            element = angular.element(iElement.html().trim());
                        var listeners = [], domListeners = [];
                        $compile(element)(scope);
                        $timeout(function () {
                            scope.$apply();
                        });
                        scope.$on('$destroy', function () {
                            listeners.forEach(function (listener) {
                                if (google && google.maps) {
                                    google.maps.event.removeListener(listener);
                                }
                            });
                            domListeners.forEach(function (listener) {
                                listener.unbind('onchange');
                            });
                        });
                        function attachListener(eventName, callback) {
                            return google.maps.event.addDomListener(element[0], eventName, function () {
                                var args = arguments;
                                var self = this;
                                //wrap in timeout to run new digest
                                $timeout(function () {
                                    callback.apply(self, args);
                                });
                            });
                        }

                        element[0].index = index || 0;
                        iElement.html('');
                        var map = ctrl.getMap();
                        if (!map.controls[position]) {
                            throw new Error('Position of control on the map is invalid. Please see google maps spec.');
                        }
                        map.controls[position].push(element[0]);
                        if (events != null) {
                            angular.forEach(events, function (value, key) {
                                if (typeof value === 'function') {
                                    if (key === 'fileSelect') {
                                        if (element[0] instanceof HTMLInputElement && element[0].type === 'file') {
                                            domListeners.push(element.bind('change', function () {
                                                value(this.files[0]);
                                            }));
                                        } else {
                                            domListeners.push(element.find('input:file').bind('change', function () {
                                                value(this.files[0]);
                                            }));
                                        }
                                    } else {
                                        listeners.push(attachListener(key, value));
                                    }
                                }
                            });
                        }
                    }
                }
            }
        ]);
})(google, angular);

/**
 * Created by artem on 5/28/15.
 */
(function (google, angular) {
    'use strict';
    /**
     * Note that if you want custom X button for info window you need to add css
     * .gm-style-iw+div{ display:none }
     * where .gm-style-iw is a class of container element, and next div is close button
     */
    angular.module('LogicifyGMap')
        .directive('logicifyGmap',
        [
            '$compile',
            '$log',
            '$timeout',
            function ($compile, $log, $timeout) {
                return {
                    restrict: 'E',
                    scope: {
                        gmOptions: '&gmOptions',
                        gmReady: '&gmReady',
                        cssOptions: '&cssOptions'
                    },
                    controller: function ($scope, $element, $attrs) {
                        var self = this;
                        /*global google*/
                        var options = $scope.gmOptions();
                        var readyCallback = $scope.gmReady();
                        var defaultOptions = {
                            zoom: 8,
                            center: new google.maps.LatLng(-34.397, 150.644)
                        };
                        var cssOpts = $scope.cssOptions();
                        options = options || {};
                        var defaultCssOptions = {
                            height: '100%',
                            width: '100%',
                            position: 'absolute'
                        };
                        angular.extend(defaultCssOptions, cssOpts);
                        angular.extend(defaultOptions, options);
                        $element.css(defaultCssOptions);
                        var div = angular.element('<div>');
                        div.css({
                            height: '100%',
                            width: '100%',
                            margin: 0,
                            padding: 0
                        });
                        $element.append(div);
                        var map = new google.maps.Map(div[0], defaultOptions);
                        self['getMap'] = function () {
                            return map;
                        };
                        if (typeof readyCallback === 'function') {
                            readyCallback(map);
                        }
                        map.openInfoWnd = function (content, map, marker, infoWindow, overrideOpen) {
                            overrideOpen.apply(infoWindow, [map, marker]);
                            if (infoWindow.$scope && infoWindow.$compiled) {
                                //update scope when info window reopened
                                $timeout(function () {
                                    infoWindow.$scope.$apply();
                                });
                            } else {
                                var childScope = $scope.$new();
                                childScope.$infoWND = infoWindow;
                                infoWindow.$scope = childScope;
                                $timeout(function () {
                                    childScope.$apply();
                                });
                            }
                            //check if we already compiled template then don't need to do it again
                            if (infoWindow.$compiled !== true) {
                                var compiled = $compile(content.trim())(infoWindow.$scope);
                                infoWindow.$compiled = true;
                                infoWindow.setContent(compiled[0]);
                            }
                        };
                        map.closeInfoWnd = function (infoWnd, overrideCloseMethod) {
                            if (infoWnd.$scope) {
                                infoWnd.$compiled = false;
                                infoWnd.$scope.$destroy();
                                delete infoWnd.$scope;
                                delete infoWnd.$compiled;
                            }
                            overrideCloseMethod.apply(infoWnd, []);
                        };
                        return self;
                    }
                }
            }
        ]);
})(google, angular);

/**
 * Created by artem on 10/7/15.
 */
/*global google*/
(function (google, angular) {
    'use strict';
    angular.module('LogicifyGMap')
        .directive('xmlOverlays', [
            '$timeout',
            '$log',
            '$q',
            '$compile',
            '$http',
            'SmartCollection',
            function ($timeout, $log, $q, $compile, $http, SmartCollection) {
                return {
                    restrict: 'E',
                    require: '^logicifyGmap',
                    scope: {
                        kmlCollection: '=kmlCollection',
                        gmapEvents: '&gmapEvents',
                        parserOptions: '&parserOptions',
                        onProgress: '&onProgress',
                        fitAllLayers: '&fitAllLayers',
                        'infoWindow': '=infoWindow'
                    },
                    link: function (scope, element, attrs, ctrl) {
                        if (!geoXML3) {
                            throw new Error('You should include geoxml3.js to be able to parse xml overlays. Please check that geoxml3.js file loads before logicify-gmap.js');
                        }
                        var geoXml3Parser = null;
                        scope.kmlCollection = new SmartCollection(scope.kmlCollection);
                        var currentCollectionPrefix = scope.kmlCollection._uid;
                        scope.events = scope.gmapEvents() || {};
                        scope.parserOptions = scope.parserOptions() || {};
                        scope.onProgress = scope.onProgress();
                        scope.fitBoundsAfterAll = scope.fitAllLayers(); //true by default
                        scope.infowindow = scope.infoWindow;
                        var promises = [], PROMISE_STATUSES = {PENDING: 0, RESOLVED: 1, REJECTED: 2};

                        function getParserOptions(map, wnd) {
                            var opts = {};
                            angular.extend(opts, scope.parserOptions);
                            //override options
                            opts.map = map;
                            opts.afterParse = afterParse;
                            opts.onAfterCreateGroundOverlay = scope.events.onAfterCreateGroundOverlay;
                            opts.onAfterCreatePolygon = scope.events.onAfterCreatePolygon;
                            opts.onAfterCreatePolyLine = scope.events.onAfterCreatePolyLine;
                            opts.failedParse = failedParse;
                            opts.infoWindow = wnd;
                            return opts;
                        }

                        /**
                         * get google map object from controller
                         */
                        scope.gMap = ctrl.getMap();
                        scope.collectionsWatcher = attachCollectionWatcher();
                        if (scope.infowindow && typeof scope.infowindow.$ready === 'function') {
                            scope.infowindow.$ready(function (wnd) {
                                geoXml3Parser = new geoXML3.parser(getParserOptions(scope.gMap, wnd));
                                initKmlCollection();
                            });
                        } else {
                            geoXml3Parser = new geoXML3.parser(getParserOptions(scope.gMap));
                            initKmlCollection();
                        }
                        scope.$on('$destroy', function () {
                            if (typeof scope.collectionsWatcher === 'function') {
                                scope.collectionsWatcher();//cancel watcher
                            }
                            //clear all pending promises
                            promises.forEach(function (promise) {
                                promise._abort();
                            });
                        });


                        /**
                         *
                         * @return {function()|*} listener
                         */
                        function attachCollectionWatcher() {
                            return scope.$watch('kmlCollection._uid', function (newValue, oldValue) {
                                //watch for top level object reference change
                                if (newValue == null || newValue != currentCollectionPrefix) {
                                    if (!(scope.kmlCollection instanceof SmartCollection)) {
                                        scope.kmlCollection = new SmartCollection(scope.kmlCollection);
                                    }
                                    currentCollectionPrefix = scope.kmlCollection._uid;
                                    if (scope['busy'] === true || geoXml3Parser.docs && geoXml3Parser.docs.length > 0) {
                                        promises.forEach(function (promise) {
                                            promise._abort();
                                        });
                                        promises.splice(0, promises.length);
                                        clearAll();
                                    }
                                    initKmlCollection().then(function () {
                                        promises.splice(0, promises.length);
                                    });
                                }
                            });
                        }

                        function onAddArrayItem(item) {
                            if (item != null) {
                                downLoadOverlayFile(item).then(function (kmlObject) {
                                    if (scope.kmlCollection.length != 1 && scope.fitBoundsAfterAll !== false) {
                                        initGlobalBounds();
                                    }
                                });
                            }
                        }

                        function onRemoveArrayItem(item) {
                            clearAll(item);
                        }

                        /**
                         * Fires when kml or kmz file has been parsed
                         * @param doc - Array that contains only one item: [0] = {Document}
                         */
                        function afterParse(doc, promise) {
                            doc[0].$uid = new Date().getTime() + '-index-' + Math.floor(Math.random() * ( -9));
                            if (typeof scope.events.onAfterParse === 'function') {
                                scope.events.onAfterParse(doc);
                            }
                            if (promise) {
                                promise.resolve(doc);
                            }
                        }

                        /**
                         * Fires when failed parse kmz or kml
                         */
                        function failedParse(doc, promise) {
                            if (promise) {
                                promise.reject(doc);
                            }
                            if (typeof scope.events.onAfterParseFailed === 'function') {
                                scope.events.onAfterParseFailed(doc);
                            }
                        }

                        function initGlobalBounds() {
                            scope.globalBounds = new google.maps.LatLngBounds();
                            if (scope.kmlCollection.length != 1 && scope.fitBoundsAfterAll !== false) {
                                scope.kmlCollection.forEach(function (item) {
                                    if (item.doc)scope.globalBounds.extend(item.doc[0].bounds.getCenter());
                                });
                                $timeout(function () {
                                    scope.gMap.fitBounds(scope.globalBounds);
                                }, 10);
                            } else if (scope.kmlCollection.length > 0 && scope.fitBoundsAfterAll !== false) {
                                $timeout(function () {
                                    scope.gMap.fitBounds(scope.kmlCollection[0].doc[0].bounds);
                                }, 10);
                            }
                        }

                        /**
                         * Cleanup
                         */
                        function clearAll(item) {
                            if (item) {
                                geoXml3Parser.hideDocument(item.doc[0]);
                                var index = geoXml3Parser.docs.indexOf(item.doc[0]);
                                if (index > -1) {
                                    delete geoXml3Parser.docsByUrl[item.doc[0].baseUrl];
                                    geoXml3Parser.docs.splice(index, 1);
                                    initGlobalBounds();
                                }
                            } else {
                                angular.forEach(geoXml3Parser.docs, function (doc) {
                                    geoXml3Parser.hideDocument(doc);
                                });
                                geoXml3Parser.docs.splice(0, geoXml3Parser.docs.length);
                                geoXml3Parser.docsByUrl = {};
                                scope.globalBounds = new google.maps.LatLngBounds();
                            }
                        }

                        /**
                         * Download all files by asset
                         */
                        function initKmlCollection() {
                            if (scope.kmlCollection instanceof SmartCollection) {
                                scope['busy'] = true;
                                scope.kmlCollection.onAddItem(onAddArrayItem);
                                scope.kmlCollection.onRemoveItem(onRemoveArrayItem);
                                scope.kmlCollection.forEach(function (kmlFile) {
                                    promises.push(downLoadOverlayFile(kmlFile));
                                });
                                return $q.all(promises).then(function (results) {
                                    initGlobalBounds();
                                    //clear all promises;
                                    promises.splice(0, promises.length);
                                    scope['busy'] = false;
                                });
                            }
                        }

                        /**
                         * Each time when "downLoadingStarted" or "parserStarted" changes we are calling this callback
                         */
                        function progress() {
                            if (typeof scope.onProgress === 'function') {
                                scope.onProgress({
                                    total: promises.length,
                                    done: getCountOf(PROMISE_STATUSES.RESOLVED),
                                    errors: getCountOf(PROMISE_STATUSES.REJECTED)
                                });
                            }
                        }

                        function getCountOf(statusCode) {
                            var count = 0;
                            promises.forEach(function (promise) {
                                if (promise.$$state.status === statusCode) {
                                    count++;
                                }
                            });
                            return count;
                        }

                        /**
                         * FIred when we need to start downloading of new kml or kmz file
                         * @param kmlObject
                         * @return {boolean}
                         */
                        function downLoadOverlayFile(kmlObject) {
                            var deferred = $q.defer();
                            var httpCanceler = $q.defer();
                            deferred.promise._abort = function () {
                                deferred.reject();
                                httpCanceler.resolve();
                            };
                            if (kmlObject.url != null) {
                                $http.get(kmlObject.url, {timeout: httpCanceler.promise, responseType: "arraybuffer"})
                                    .then(function (response) {
                                        var data = new Blob([response.data], {type: response.headers()['content-type']});
                                        data.lastModifiedDate = new Date();
                                        data.name = 'example' + data.lastModifiedDate;
                                        onAfterDownload(data, null, deferred);
                                    });

                            } else if (typeof kmlObject.content === 'string') {
                                onAfterDownload(null, kmlObject.content, deferred);
                            } else {
                                if (kmlObject.file instanceof Blob) {
                                    onAfterDownload(kmlObject.file, null, deferred);
                                } else {
                                    $log.error('Incorrect file type. Should be an instance of a Blob or String (url).');
                                }
                            }
                            var promise = deferred.promise
                                .then(function (doc) {
                                    kmlObject.doc = doc;
                                    return kmlObject;
                                })
                                .catch(function (doc) {
                                    //handle errors here
                                })
                                .finally(function () {
                                    progress();
                                });
                            return promise;
                        }

                        /**
                         * When downloading finished we need start parsing
                         * @param blob - if it's a file
                         * @param content - if it's a string
                         */
                        function onAfterDownload(blob, content, deferred) {
                            content == null ? geoXml3Parser.parse(blob, null, deferred) : geoXml3Parser.parseKmlString(content, null, deferred);
                        }
                    }
                }
            }
        ]);
})(google, angular);
/**
 * Created by artem on 6/18/15.
 */
/*global google*/
(function (google, angular) {
    angular.module('LogicifyGMap')
        .service('InfoWindow', ['$log', '$rootScope', '$templateCache', '$timeout', '$http', '$compile', function ($log, $rootScope, $templateCache, $timeout, $http, $compile) {
            function InfoWindow() {
                var self = this;
                //private
                var readyCallbackHolders = [], isInfoWndReady = false, lastMap = null;
                //public
                self['$ready'] = function (callback) {
                    if (isInfoWndReady === true && callback) {
                        callback(self);
                        return;
                    }
                    if (callback) {
                        readyCallbackHolders.push(callback);
                    }
                };

                //base logic function
                function overridesMethods(content) {
                    //override method 'open'
                    var overrideOpen = self['open'];
                    self['open'] = function (map, marker) {
                        lastMap = map;
                        if (map != null && typeof map.openInfoWnd === 'function') {
                            map.openInfoWnd(content, map, marker, self, overrideOpen);
                        }
                    };
                    //override method 'close'
                    var overrideClose = self['close'];
                    self['close'] = function (destroyScope) {
                        if (!lastMap) {
                            return;
                        }
                        if (typeof lastMap.closeInfoWnd === 'function' && destroyScope === true) {
                            lastMap.closeInfoWnd(self, overrideClose);
                        } else {
                            overrideClose.apply(self, []);
                        }
                    };
                    //notify all registered listeners that info window is ready
                    isInfoWndReady = true;
                    if (readyCallbackHolders.length > 0) {
                        for (var i = 0; i < readyCallbackHolders.length; i++) {
                            readyCallbackHolders[i](self);
                        }
                        readyCallbackHolders = [];
                    }
                }

                //if arguments
                if (arguments[0]) {
                    //select logic if info window creates via template url
                    if (arguments[0].templateUrl) {
                        $http.get(arguments[0].templateUrl, {cache: $templateCache})
                            .then(function (response) {
                                arguments[0].content = response.data;
                                google.maps.InfoWindow.apply(self, arguments);
                                overridesMethods(response.data);
                            });
                    } else if (arguments[0].content) {
                        //if via 'content'
                        google.maps.InfoWindow.apply(self, arguments);
                        overridesMethods(arguments[0].content);
                    }
                } else {
                    //if no args then just call parent constructor, because we can't handle it
                    google.maps.InfoWindow.apply(self, arguments);
                }
            }

            if (google) {
                InfoWindow.prototype = Object.create(google.maps.InfoWindow.prototype);
                InfoWindow.prototype.constructor = InfoWindow;
            }
            return InfoWindow;
        }])
})(google, angular);
/**
 * Created by artem on 10/12/15.
 */
(function (angular) {
    'use strict';
    angular.module('LogicifyGMap')
        .service('SmartCollection', [function () {
            /**
             * Service is a singleton, so we can use global variable to generate uid!
             */
            var uid = 0;

            function SmartCollection(arr) {
                var self = this;
                //private property
                //init before overriding
                if (Array.isArray(arr)) {
                    arr.forEach(function (item, index) {
                        self.push(item);
                    });
                }
                self._uid = uid++;
                var addCB = [], removeCB = [];
                /**
                 * Override all methods that are changing an array!
                 */
                var push = self.push;
                self['push'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = push.apply(self, args);
                    args.forEach(function (item) {
                        addCB.forEach(function (callback) {
                            callback.apply(self, [item]);
                        });
                    });
                    return result;
                };
                var pop = self.pop;
                self['pop'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = pop.apply(self, args);
                    removeCB.forEach(function (callback) {
                        callback.apply(self, [result]);
                    });
                    return result;
                };
                var unshift = self.unshift;
                self['unshift'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = unshift.apply(self, args);
                    args.forEach(function (item) {
                        addCB.forEach(function (callback) {
                            callback.apply(self, [item]);
                        });
                    });

                    return result;
                };
                var shift = self.shift;
                self['shift'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = unshift.apply(self, args);
                    removeCB.forEach(function (callback) {
                        callback.apply(self, [result]);
                    });
                    return result;
                };
                var splice = self.splice;
                self['splice'] = function () {
                    var args = Array.prototype.slice.call(arguments);
                    var result = splice.apply(self, args);
                    result.forEach(function (item) {
                        removeCB.forEach(function (callback) {
                            callback.apply(self, [item]);
                        });
                    });

                    return result;
                };
                /**
                 * The same as "splice", but does not call onRemove callback
                 * @return {Array}
                 */
                self['removeQuietly'] = splice;
                self['onRemoveItem'] = function (cb) {
                    if (typeof cb === 'function') {
                        removeCB.push(cb);
                    }
                };
                self['onAddItem'] = function (cb) {
                    if (typeof cb === 'function') {
                        addCB.push(cb);
                    }
                };
            }

            SmartCollection.prototype = Object.create(Array.prototype);
            SmartCollection.prototype.constructor = SmartCollection;
            return SmartCollection;
        }]);
})(angular);