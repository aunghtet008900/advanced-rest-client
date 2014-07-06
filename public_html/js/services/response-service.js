/**
 * @ngname Overview
 * @name arc.responsepService
 * 
 * @description
 * Service providing utilities methods for HTTP response..
 */
angular.module('arc.responsepService', [])
.factory('ResponseUtils', ['$q','RestConventer',function($q,RestConventer) {
    /**
     * @ngdoc method
     * @name ResponseUtils.toClipboard
     * @function
     * 
     * @description Copy [data] to clipboard.
     * This function will use a trick with a textarea to copy data.
     * @param {Any} data If is not string .toString() function will be called.
     * 
     * @example 
     *  ResponseUtils.toClipboard('Some text to copy');
     *  
     * @returns {Boolean} It will always return true.
     */
    var copy2Clipoboard = function(data) {
        if (typeof data !== 'string') {
            data = data.toString();
        }

        var clipboardholder = document.createElement("textarea");
        document.body.appendChild(clipboardholder);
        clipboardholder.value = data;
        clipboardholder.select();
        document.execCommand("Copy");
        clipboardholder.parentNode.removeChild(clipboardholder);

        return true;
    };
    
    /**
     * @ngdoc method
     * @name ResponseUtils.asCurl
     * @function
     * 
     * @description Copy the request to clipboard as a cURL command.
     * 
     * @param {HttpRequest} request HTTP request obiect.
     * @returns {$q@call;defer.promise}
     */
    var copyAsCurl = function(request){
        var deferred = $q.defer();
        RestConventer.asCurl(request)
        .then(copy2Clipoboard)
        .then(deferred.resolve)
        .catch(deferred.reject);
        return deferred.promise;
    };
    /**
     * @ngdoc method
     * @name ResponseUtils.asFile
     *  @function
     * 
     * @description Save response payload as file on user's filesystem.
     * 
     * @param {HttpResponse} response Response data.
     * @returns {undefined}
     */
    var saveResponseAsFile = function(response){
        var deferred = $q.defer();
        
        
        var mime = _getContentType(response.headers);
        var fileExt = _getFileExtension(mime);
        var fileOptions = {
            'type': 'saveFile',
            'suggestedName': 'http-export.' + fileExt
        };
        
        chrome.fileSystem.chooseEntry(fileOptions, function(entry){
            if(chrome.runtime.lastError){
                throw chrome.runtime.lastError;
            }
            if(!entry){
                throw 'No file selected.';
            }
            entry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = deferred.resolve;
                fileWriter.onerror = deferred.reject;
                var blob = new Blob([response.response], {type: mime});
                fileWriter.write(blob);
            });
            
        });
        
        return deferred.promise;
    };
    
    
    /**
     * Get response content type (mime type) according to it's response headers
     * @param {HttpHeaders} httpHeaders Response headers
     * @returns {String} Response content type or 'text/plain' as default mime.
     */
    var _getContentType = function(httpHeaders){
        var contentType = 'text/plain';
        for(var i = 0, len = httpHeaders.length; i < len; i++){
            if(httpHeaders[i].name.toLowerCase() !== 'content-type') continue;
            var data = httpHeaders[i].value.split(';');
            if(data && data.length > 0){
                contentType = data[0];
                break;
            }
        }
        return contentType;
    };
    
    /**
     * Get file extenstion according to mime type.
     * @param {String} mime
     * @returns {String}
     */
    var _getFileExtension = function(mime){
        var result = '';
        switch(mime){
            case 'text/plain': result = 'txt'; break;
            case 'text/html': result = 'html'; break;
            case 'application/json': 
            case 'text/json':
                result = 'json'; break;
            case 'application/javascript': 
            case 'text/javascript':
                result = 'js'; break;
            case 'text/css':
                result = 'css'; break;
            default:
                result = 'txt'; break;
        }
        return result;
    };
    var service = {
        'toClipboard': copy2Clipoboard,
        'asCurl': copyAsCurl,
        'asFile': saveResponseAsFile
    };
    return service;
}])
.factory('ViewWorkersService', ['$q','$sce',function($q,$sce) {
    
    function parseView(script, data){
        var deferred = $q.defer();
        var worker = new Worker('js/workers/'+script+'.js');
        worker.addEventListener('message', function(e) {
            deferred.resolve($sce.trustAsHtml(e.data));
        }, false);
        worker.addEventListener('error', function(e) {
            deferred.reject(e);
        }, false);
        worker.postMessage(data);
        return deferred.promise;
    }
    
    function parseXmlView(data){
        return parseView('xmlviewer', data);
    }
    
    function parseHtmlView(data){
        return parseView('htmlviewer', data);
    }
    
    function parseJsonView(data){
        return parseView('jsonviewer', data);
    }
    
    var service = {
        'xml': parseXmlView,
        'html': parseHtmlView,
        'json': parseJsonView
    };
    return service;
}]);