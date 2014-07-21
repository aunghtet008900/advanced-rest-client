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
.factory('RequestValues', ['RequestParser', 'history', function(parser, history) {
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
        history.set('latest', data)
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
        return history.get('latest')
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
                console.error('Error restoring history object from latest',e);
            });
        })
        .catch(function(error){
            console.error('Error restoring latest object', error);
        });
    };
    
    return service;
}]);