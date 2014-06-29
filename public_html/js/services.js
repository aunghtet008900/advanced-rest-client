
'use strict';

var AppServices = angular.module('arc.services', []);

/**
 * @ngdoc overview
 * @name arc.services
 *
 * @description
 * Advaced Rest Client form values.
 * This service only keeps current Request values.
 */
AppServices.factory('RequestValues', ['RequestParser', 'fsHistory', function(parser, fsHistory) {
    var service = {
        //current URL value
        'url': null, //'http://blog.gdgpoland.org/feeds/posts/default?alt=json', //'http://beerlovers.kalicinscy.com/pubs/getCities.json',//'http://www.googleapis.com/youtube/v3/videos?id=7lCDEYXw3mM&key=AIzaSyD2OjJy2eMbxA1PVpW2AWstcQ2mAZkxpLQ&part=snippet,contentDetails,statistics,status',//'http://gdata.youtube.com/feeds/api/playlists/OU2XLYxmsIKNXidK5HZsHu9T7zs6nxwK/?v=2&alt=json&feature=plcp', //https://www.google.com
        //current HTTP method. GET by default.
        'method': 'GET',
        //headers array. Array of objects where keys are "name" and "value"
        'headers': {
            'value': []
        },
        //payload is a string of data to send
        'payload': {
            'value': null
        },
        //array of FileObjects
        'files': []
    };
    
    /**
     * Convert heders array to string value.
     * Headers is instance of Array.
     * @returns {String}
     */
    service.headers.toString = function(){
        if(this.value.length === 0) return '';
        return parser.headersToString(this.value);
    };
    service.headers.toArray = function(headersString){
        if(this.value.length === 0) return [];
        return parser.headersToArray(headersString);
    };
    service.headers.fromString = function(headersString){
        if(this.length === 0) {
            service.headers.value =  '';
            return;
        }
        service.headers.value = parser.headersToArray(headersString);
    };
    
    /**
     * Shortcut to get current value of the Content-Type header.
     * It will return null if there is no Content-Type header.
     * @returns {String|null}
     */
    service.getCurrentContentType = function () {
        var h = service.headers.value;
        for (var i = 0, len = h.length; i < len; i++) {
            if (h[i].name.toLowerCase() === 'content-type') {
                return h[i].value;
            }
        }
        return null;
    };
    /**
     * Check if cuurent request can carry payload.
     * @returns {Boolean}
     */
    service.hasPayload = function(){
        return ['GET','DELETE','OPTIONS'].indexOf(service.method) === -1;
    };
    /**
     * Convert current request data to JSON object
     * @returns {Object}
     */
    service.toJson = function(){
        var result = {
            'url': service.url,
            'method': service.method,
            'headers': service.headers.value,
            'payload': service.payload.value
        };
        return result;
    };
    /**
     * Store current values in sync storage. 
     * After the app runs again it will be used to update UI with it's values.
     * @returns {undefined}
     */
    service.store = function(){
        var data = JSON.stringify(service.toJson());
        fsHistory.set('latest', data)
        .then(function(){})
        .catch(function(error){
            console.error(error);
        });
    };
    /**
     * Restore current values from storage
     * @returns {undefined}
     */
    service.restore = function(){
        return fsHistory.get('latest')
        .then(function(dataStr){
            if(!!!dataStr || dataStr === "") {
                console.info("No data in restored str.");
                return;
            }
            var data;
            try{
                data = JSON.parse(dataStr);
            } catch(error){
                console.error('Error parsing latest data.',error);
                console.error(error.stack);
                return;
            }
            if(!!!data){
                console.info('No restored data available.');
                return;
            }
            if(!!data.url){
                service.url = data.url;
            }
            if(!!data.method){
                service.method = data.method;
            }
            if(!!data.headers){
                service.headers.value = data.headers;
            }
            if(!!data.payload){
                service.payload.value = data.payload;
            }
        })
        .catch(function(error){
            console.error(error);
        });
    };
    
    return service;
}]);
/**
 * @ngdoc overview
 * @name RequestParser
 *
 * @description
 * This service is sed to parse headers and payload values from array to HTTP string 
 * or vice versa.
 */
AppServices.factory('RequestParser', [function() {
        
        /** 
         * Filter array of headers and return not duplicated array of the same headers. 
         * Duplicated headers should be appended to already found one using coma separator. 
         * @param {Array} headers Headers array to filter. All objects in headers array must have "name" and "value" keys.
         */
        function filterArray(headers) {
            var _tmp = {};
            for (var i = 0, len = headers.length; i < len; i++) {
                var header = headers[i];
                if (header.name in _tmp) {
                    if (header.value && !header.value.isEmpty()) {
                        _tmp[header.name] += ', ' + header.value;
                    }
                } else {
                    _tmp[header.name] = header.value;
                }
            }
            var result = [];
            for (var _key in _tmp) {
                result[result.length] = {
                    'name': _key,
                    'value': _tmp[_key]
                };
            }
            return result;
        }
        
        /**
         * Parse headers array to Raw HTTP headers string.
         * @param {Array} headersArray list of objects with "name" and "value" keys.
         * @returns {String}
         */
        var headersToString = function(headersArray){
            if(!(headersArray instanceof Array)){
                throw "Headers must be an instance of Array";
            }
            if(headersArray.length ===0) return '';
            
            headersArray = filterArray(headersArray);
            var result = '';
            for (var i = 0, len = headersArray.length; i < len; i++) {
                var header = headersArray[i];
                if (!result.isEmpty()) {
                    result += "\n";
                }
                var key = header.name,
                        value = header.value;
                if (key && !key.isEmpty()) {
                    result += key + ": ";
                    if (value && !value.isEmpty()) {
                        result += value;
                    }
                }
            }
            return result;
        };
        /**
         * Parse HTTP headers input from string to array of a key:value pairs objects.
         * @param {String} headersString Raw HTTP headers input
         * @returns {Array} The array of key:value objects
         */
        function headersToArray(headersString) {
            if(typeof headersString !== "string"){
                throw "Headers must be an instance of String.";
            }
            if (headersString === null || headersString.isEmpty()) {
                return [];
            }
            var result = [], headers = headersString.split(/[\r\n]/gim);
            for (var i in headers) {
                var line = headers[i].trim();
                if (line.isEmpty())
                    continue;

                var _tmp = line.split(/[:\r\n]/i);
                if (_tmp.length > 0) {
                    var obj = {
                        name: _tmp[0],
                        value: ''
                    };
                    if (_tmp.length > 1) {
                        _tmp.shift();
                        _tmp = _tmp.filter(function(element){
                            return element.trim() !== '';
                        });
                        obj.value = _tmp.join(', ').trim();
                    }
                    result[result.length] = obj;
                }
            }
            return result;
        }
        
        return {
            'headersToString': headersToString,
            'headersToArray': headersToArray
        };
}]);



/**
 * Service to handle operation on current Request object.
 * This service keep
 */
AppServices.factory('HistoryValue', ['$q','RequestValues','DriveService','DBService', '$rootScope', 'APP_EVENTS', 'Filesystem', 
    function($q,RequestValues,DriveService,DBService,$rootScope, APP_EVENTS, Filesystem) {
        $rootScope.$on(APP_EVENTS.errorOccured, function(e, msg, reason){});
        
        var service = {};
        
        var getCurrent = function(){
            var deferred = $q.defer();
            if(service.current !== null){
                deferred.resolve(service.current);
            } else {
                deferred.resolve(create({'store_location': 'history'}));
            }
            return deferred.promise;
        };
        
        
        /**
         * @ngdoc method
         * @name HistoryValue.create
         * @function
         * 
         * @description Create new HistoryValue object and populate with values.
         * This function must be called before calling HistoryValue.save()
         * to create save object.
         * @param {Object} params Initial metadata for object.
         *  'store_location' (String), required, - either 'history','local' or 'drive'
         *  'name' (String), required if [store_location] is 'local' or 'drive',
         *  'project_name' (String), optional - Associated project name.
         * @example 
         *  HistoryValue.create({'store_location': 'local','name':'My request'});
         * 
         * 
         * @returns {undefined}
         */
        var create = function(params){
            
            if(!'store_location' in params){
                throw "You must add store_location to create HistoryValue object";
            }
            if((params.store_location === 'local' || params.store_location === 'drive') && !params.name){
                throw "You must specify file name to create HistoryValue object";
            }
            
            service.current = {};
            service.current.store_location = params.store_location;
            service.current.har = null;
            if(params.name){
                service.current.name = params.name;
            }
            if(params.project_name){
                service.current.project_name = params.project_name;
            }
            return service.current;
        };
        
        /**
         * @ngdoc method
         * @name HistoryValue.store
         * @function
         * 
         * @description Store current object into selected storage (depending on 'store_location').
         * 
         * @example 
         *  HistoryValue.store().then(function(storedObject){ ... });
         * 
         * 
         * @returns {$q@call;defer.promise} The promise with stored object.
         */
        var store = function(){
            
            if(service.current === null){
                throw 'There\'s no object to store.';
            }
            var deferred = $q.defer();
            var storeService;
            switch(service.current.store_location){
                case 'local': 
                case 'history': storeService = Filesystem; break;
                case 'drive': storeService = DriveService; break;
                default:
                    deferred.reject('Unknown store location :(');
                    return deferred.promise;
            }
            
            var onResult = function(result){
                service.current.file = result;
                deferred.resolve(result);
            };
            
            storeService.store(service.current)
            .then(onResult)
            .catch(function(reason){
                deferred.reject(reason);
            });
            return deferred.promise;
        };
        
        service = {
            /**
             * restored object currently loaded into app
             */
            'current': null,
            'create': create,
            'store': store,
            'getOrCreate': getCurrent
        };
        return service;
}]);

/**
 * A service responsible for getting definitions data like status codes or headers.
 */
AppServices.factory('Definitions', ['$q','$http', function($q, $http) {
    /**
     * @ngdoc method
     * @name Definitions.get
     * @function
     * 
     * @description Get app's definitions like HTTP status codes with explanations 
     * or HTTP request/response headers definitions.
     * @param {String} section it can be either: 'status', 'request-headers' or 'response-headers'
     * @example 
     *  Definitions.get('request-headers')
     *  .then(function(headers){
     *      headers.length;
     *  });
     * 
     * @returns {undefined}
     */
    var getDefinitions = function(section){
        var url = 'data/';
        switch(section){
            case 'status': url += 'http-status.json'; break;
            case 'request-headers': url += 'request-headers.json'; break;
            case 'response-headers': url += 'response-headers.json'; break;
            default:
                throw "Unknown section name: " + section;
        }
        return $http.get(url, {cache:true});
    };
    
    var service = {
        'get': getDefinitions
    };
    return service;
}]);
/**
 * http://stackoverflow.com/a/21963136/1127848
 */
AppServices.factory('UUID', function () {
    var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
    return function () {
      var d0 = Math.random()*0xffffffff|0;
      var d1 = Math.random()*0xffffffff|0;
      var d2 = Math.random()*0xffffffff|0;
      var d3 = Math.random()*0xffffffff|0;
      return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
        lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
        lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
        lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
    };
});