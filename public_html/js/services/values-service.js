/**
 * @ngname Overview
 * @name arc.valuesService
 * 
 * @description
 * This module is keeping form data and restorede items definitions.
 */
angular.module('arc.valuesService', [])
/**
 * @ngdoc overview
 * @name arc.services
 *
 * @description
 * This service is responsible for keeping current HTTP form values. It also 
 * provide utility methods for parsing headers and payload from array to string
 * and back.
 * 
 * For example RequestValues.headers array has overwritten method toString()
 * which will return a HTTP representation of the headers.
 * 
 * Headers array has also additonal methods for creating headers array from
 * JSON String (toArray) or for restore form values from JSON string and passing
 * them to service values (fromString).
 * 
 * @todo: Remove fsHistory object from here.
 */
.factory('RequestValues', ['RequestParser', 'fsHistory','history', function(parser, fsHistory,history) {
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
     * @gndoc function
     * @name RequestValues.headers.toString
     * 
     * @description
     * Convert current heders array to HTTP string representation.
     * 
     * @returns {String}
     */
    service.headers.toString = function(){
        if(this.value.length === 0) return '';
        return parser.headersToString(this.value);
    };
    /**
     * @gndoc function
     * @name RequestValues.headers.toArray
     * 
     * @description
     * This method will convert HTTP headers string into array representation.
     * 
     * @param {String} headersString HTTP headers string
     * 
     * @return {Array} Array of objects with "name" and "value" keys.
     */
    service.headers.toArray = function(headersString){
        if(this.value.length === 0) return []; //TODO: to be removed?
        return parser.headersToArray(headersString);
    };
    /**
     * @gndoc function
     * @name RequestValues.headers.fromString
     * 
     * @description
     * This method will convert HTTP headers string into it's array 
     * representation and set current form headers values.
     * 
     * @param {String} headersString HTTP headers string
     * 
     * @return {Undefined}
     */
    service.headers.fromString = function(headersString){
        if(this.length === 0) {
            service.headers.value =  '';
            return;
        }
        service.headers.value = parser.headersToArray(headersString);
    };
    
    /**
     * @ngdoc function
     * @name RequestValues.getCurrentContentType
     * 
     * @description
     * Extract current value of the Content-Type header.
     * It will return null if there is no Content-Type header.
     * 
     * @return {String|null} Content type or null of not set.
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
     * @ngdoc function
     * @name RequestValues.hasPayload
     * 
     * @description
     * According to HTTP spec some request types can't carry a payload.
     * This method will check if cuurent request can carry a payload.
     * 
     * @return {Boolean} True if current request can carry a payload. False otherwise.
     */
    service.hasPayload = function(){
        return ['GET','DELETE','OPTIONS'].indexOf(service.method) === -1;
    };
    /**
     * @ngdoc function
     * @name RequestValues.toJson
     * 
     * @description
     * Convert current request data to the JSON object.
     * @return {Object}
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
     * @ngdoc function
     * @name RequestValues.store
     * 
     * @description
     * Store current values in sync storage. 
     * After the app runs again it will be used to update UI with it's values.
     * 
     * @return {undefined}
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
     * @ngdoc function
     * @name RequestValues.restore
     * 
     * @description
     * Restore current values from Chrome sync storage.
     * 
     * @return {undefined}
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
            history.restore(data.url, data.method).catch(function(e){
                window.console.erro(e);
            });
        })
        .catch(function(error){
            console.error(error);
        });
    };
    
    return service;
}]);


/**
 * @ngdoc Overview
 * @name HistoryValue
 * 
 * @description
 * Besides RequestValues which holds current form values the app is using second
 * service to hold historical data with reference to place where it is saved.
 * 
 * Historical data will keep the request values (method, url, headers, payload)
 * as well as responses history (if requested, then will be requested from 
 * storage).
 * 
 * History data can be kept in different places depending of user's choice. 
 * History is always saved in storage (IndexedDb or as file in syncStorage).
 * It can also be saved as a Drive file. Drive files are stored in Google Drive
 * using different store service.
 * 
 * History items stored locally in sync storage or IndexedDb can have name 
 * (if user requested). It means that user want to save historical data as saved 
 * (named) request. It will use different interface to view or search for requests.
 */
//.factory('HistoryValue', ['$q','DriveService', '$rootScope', 'APP_EVENTS', 'Filesystem', 'DBService', 
//    function($q,DriveService,$rootScope, APP_EVENTS, Filesystem, DBService) {
//        $rootScope.$on(APP_EVENTS.errorOccured, function(e, msg, reason){});
//        
//        var service = {};
//        
//        var getCurrent = function(){
//            var deferred = $q.defer();
//            if(service.current !== null){
//                deferred.resolve(service.current);
//            } else {
//                deferred.resolve(create({'store_location': 'history'}));
//            }
//            return deferred.promise;
//        };
//        
//        
//        /**
//         * @ngdoc method
//         * @name HistoryValue.create
//         * @function
//         * 
//         * @description Create new HistoryValue object and populate with values.
//         * This function must be called before calling HistoryValue.save()
//         * to create save object.
//         * @param {Object} params Initial metadata for object.
//         *  'store_location' (String), required, - either 'history','local' or 'drive'
//         *  'name' (String), required if [store_location] is 'local' or 'drive',
//         *  'project_name' (String), optional - Associated project name.
//         * @example 
//         *  HistoryValue.create({'store_location': 'local','name':'My request'});
//         * 
//         * 
//         * @returns {undefined}
//         */
//        var create = function(params){
//            
//            if(!'store_location' in params){
//                throw "You must add store_location to create HistoryValue object";
//            }
//            if((params.store_location === 'local' || params.store_location === 'drive') && !params.name){
//                throw "You must specify file name to create HistoryValue object";
//            }
//            
//            service.current = {};
//            service.current.store_location = params.store_location;
//            service.current.har = null;
//            service.current.db = null;
//            if(params.name){
//                service.current.name = params.name;
//            }
//            if(params.project_name){
//                service.current.project_name = params.project_name;
//            }
//            return service.current;
//        };
//        
//        /**
//         * @ngdoc method
//         * @name HistoryValue.store
//         * @function
//         * 
//         * @description Store current object into selected storage (depending on 'store_location').
//         * 
//         * @example 
//         *  HistoryValue.store().then(function(storedObject){ ... });
//         * 
//         * 
//         * @returns {$q@call;defer.promise} The promise with stored object.
//         */
//        var store = function(response){
//            
//            if(service.current === null){
//                throw 'There\'s no object to store.';
//            }
//            var deferred = $q.defer();
//            var storeService;
//            switch(service.current.store_location){
//                case 'local': 
//                case 'history': storeService = Filesystem; break;
//                case 'drive': storeService = DriveService; break;
//                default:
//                    deferred.reject('Unknown store location :(');
//                    return deferred.promise;
//            }
//            
//            var onResult = function(result){
//                service.current.file = result;
//                
//                ///updateDat
//                var storeData;
//                if(service.current.db === null){
//                    storeData = {
//                        'url': response.request.url,
//                        'method': response.request.method,
//                        'type': service.current.store_location,
//                        'project_name': null,
//                        'name': null,
//                        'file': null,
//                        'drive': null
//                    };
//                } else {
//                    storeData = service.current.db;
//                }
//                
//                DBService.store(storeData).then(function(e){
//                    deferred.resolve(result);
//                });
//                
//            };
//            
//            storeService.store(service.current)
//            .then(onResult)
//            .catch(function(reason){
//                deferred.reject(reason);
//            });
//            return deferred.promise;
//        };
//        
//        var restoreCurrent = function(dbKey){
//            DBService.restore(dbKey).then(function(result){
//                console.log(dbKey, result);
//            });
//            //service.current.db
//        };
//        
//        service = {
//            /**
//             * restored object currently loaded into app
//             */
//            'current': null,
//            'create': create,
//            'store': store,
//            'getOrCreate': getCurrent,
//            'restoreCurrent': restoreCurrent
//        };
//        return service;
//}]);