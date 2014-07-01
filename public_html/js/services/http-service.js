/**
 * @ngname Overview
 * @name arc.httpService
 * 
 * @description
 * Service responsible for making HTTP requests, saving request history and reportinh results.
 */
angular.module('arc.httpService', [])
  .factory('HttpRequest', 
  ['$q','HistoryValue', 'RequestValues','DBService', '$rootScope', 'APP_EVENTS','$http','ChromeTcp', 'RestConventer',
    function($q, HistoryValue, RequestValues, DBService, $rootScope, APP_EVENTS, $http, ChromeTcp, RestConventer) {
        $rootScope.$on(APP_EVENTS.START_REQUEST, function(e){
            runRequest()
            .then(function(e){
                $rootScope.$broadcast(APP_EVENTS.END_REQUEST, e);
                saveHistory(e);
            })
            .catch(function(e){
                $rootScope.$broadcast(APP_EVENTS.REQUEST_ERROR, e);
                saveHistory(e);
            });
        });
    
    function saveHistory(response){
        getHistoryObject()
        .then(updateHistoryObject.bind(response))
        .then(saveHistoryObject.bind(response))
        .then(function(){
            console.log('History has been saved.', HistoryValue.current);
        })
        .catch(function(error){
            console.error('Can\'t save history object.', error);
        });
    };
    
    
    /**
     * 
     * @returns {$q@call;defer.promise}
     */
    function runRequest(){
        var deferred = $q.defer();
        
        function onRequestObjectReady(request){
            
            request.addEventListener('load', function(e){
                deferred.resolve(e);
            }).addEventListener('error', function(e){ 
                console.log('ERROR',e);
                if(e&&e[0]&&!!e[0].code){
                    $http.get('data/connection_errors.json').then(function(result){
                        if(result && result.data){
                            if(e[0].code in result.data){
                                console.error("Error occured:", result.data[e[0].code]);
                                var message = e[0].message + "\n" + result.data[e[0].code];
                                deferred.reject({
                                    'code': e[0].code,
                                    'message': message
                                });
                                
                                delete result.data;
                            }
                        }
                    });
                }
                
            }).addEventListener('timeout', function(e){ 
                deferred.reject({'timeout':true});
            }).addEventListener('start', function(e){ 
                //console.log('START',e);
            }).addEventListener('progress', function(e){ 
               // console.log('PROGRESS',e);
            }).addEventListener('uploadstart', function(e){ 
                //console.log('UPLOADSTART',e);
            }).addEventListener('upload', function(e){ 
                //console.log('UPLOAD',e);
            }).addEventListener('abort', function(e){ 
                deferred.reject({'abort':true});
            })
            .send();
        }
        try{
            RequestValues.store();
        } catch(e){}
        
        createRequestObject()
        .then(applyMagicVariables)
        .then(createTheRequest)
        .then(onRequestObjectReady)
        .catch(function(reason){
            deferred.reject(reason);
        });
        return deferred.promise;
    }
    
    function createRequestObject(){
        var deferred = $q.defer();
        var requestObject = {
            url: RequestValues.url,
            method: RequestValues.method,
            headers: RequestValues.headers.value,
            payload: RequestValues.payload.value,
            files: RequestValues.files
        };
        deferred.resolve(requestObject);
        return deferred.promise;
    }
    
    
    function applyMagicVariables(requestObject){
        var deferred = $q.defer();
        deferred.resolve(requestObject);
        return deferred.promise;
    }
    
    function createTheRequest(requestObject){
        var deferred = $q.defer();
        
        var requestParams = {
            'url': requestObject.url,
            'method': requestObject.method,
            'timeout': 30000,
            'debug': false
        };
        
        if(RequestValues.hasPayload() && requestObject.payload){
            requestParams.body = requestObject.payload;
        }
        if(requestObject.headers.length > 0){
            var _headers = {};
            for(var i=0, len=requestObject.headers.length;i<len;i++){
                var _h = requestObject.headers[i];
                _headers[_h.name] = _h.value;
            }
            requestParams.headers = _headers;
        }
        var req = ChromeTcp.create(requestParams);
        
        deferred.resolve(req);
        return deferred.promise;
    }
    
    
    
    var getHistoryObject = function(){
        var deferred = $q.defer();
        HistoryValue.getOrCreate().then(function(obj){
            if(!!!obj){
                deferred.reject(obj);
                return;
            }
            deferred.resolve(obj);
        }).catch(deferred.reject);
        return deferred.promise;
    };
    
    var updateHistoryObject = function(historyValue){
        var deferred = $q.defer();
        if(!this.request){
            throw "Request does not contain valid data.";
        }
        RestConventer.asHar(historyValue.har, this)
        .then(function(har){
            HistoryValue.current.har = har;
            deferred.resolve(har);
        })
        .catch(function(error){
            console.error('HAR builder error: ', error);
            deferred.reject(error);
        });
        
        return deferred.promise;
    };
    var saveHistoryObject = function(){
        return HistoryValue.store();
    };
    var saveHistoryObject = function(){
        return HistoryValue.store(this);
    };
    
    
    function searchHistoryFormMatch(list){
        if(!list) return null;
        for(var i=0, len=list.length; i<len; i++){
            var item = list[i].value;
            
            if(RequestValues.headers.value != item.headers.value){
                continue;
            }
            if(RequestValues.payload.value != item.payload.value){
                continue;
            }
            
            return item;
        }
        return null;
    }
    
    var service = {
       'run': runRequest 
    };
    return service;
}]);