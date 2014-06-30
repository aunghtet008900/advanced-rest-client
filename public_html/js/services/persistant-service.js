/**
 * @ngname Overview
 * @name arc.responsepService
 * 
 * @description
 * Service providing utilities methods for HTTP response..
 */
angular.module('arc.persistantService', [])

/**
 * @ngdoc overview
 * @name $ChromeStorage
 * 
 * @description Access to Chrome's storage area (either sync or local).
 * It require "storage" permission in the manifest file.
 */
.factory('$ChromeStorage', ['$q', function($q) {
  
  /**
   * @ngdoc overvew
   * @name $ChromeStorage.set
   * 
   * @description Save data to Chrome's local or synch storage.
   * @param {String} type - optional, default local, may be sync
   * @param {Object} data - data to save
   *
   * @example 
   *  $ChromeStorage.save({'key':'value'}); //save data to local storage
   *  $ChromeStorage.save('sync', {'key':'value'}); //save data to synch storage
   *  $ChromeStorage.save('local', {'key':'value'}); //save data to local storage
   *
   * @return The Promise object. Defered.then() function will not return a param.
   */
    function saveData(type, data){
        if(typeof data === 'undefined'){
            data = type;
            type = 'local';
        }
        var defered = $q.defer();
        if(['local','sync'].indexOf(type) === -1){
            defered.reject('Unknown storage type: ' + type);
            return defered.promise;
        }

        var storage = chrome.storage[type];
        storage.set(data, function(){
            if(chrome.runtime.lastError){
              defered.reject(chrome.runtime.lastError); return;
            }
            defered.resolve();
        });

        return defered.promise;
    }

    /**
     * @ngdoc overvew
     * @name $ChromeStorage.get
     * 
     * @description Restore data from Chrome's local or synch storage.
     * @param {String} type - optional, default local, may be sync
     * @param {String|Array|Object} data - data to restore. See chrome app's storage for more details. 
     *
     * @example 
     *  $ChromeStorage.get({'key':'default_value'}); //restore data from local storage
     *  $ChromeStorage.get('sync', 'key'); //restore data from synch storage
     *  $ChromeStorage.get('local', ['key1', 'key2']); //restore data from local storage
     *
     * @return The Promise object. Defered.then() function will return a param with restored data.
     */
    function restoreData(type, data) {
        if (typeof data === 'undefined') {
            data = type;
            type = 'local';
        }
        var defered = $q.defer();
        if (['local', 'sync'].indexOf(type) === -1) {
            defered.reject('Unknown storage type: ' + type);
            return defered.promise;
        }

        var storage = chrome.storage[type];
        storage.get(data, function(restored) {
            if (chrome.runtime.lastError) {
                defered.reject(chrome.runtime.lastError);
                return;
            }
            defered.resolve(restored);
        });

        return defered.promise;
    }

    return {
        'set': saveData,
        'get': restoreData
    };
}])
/**
 * Service responsible to manage Drive files.
 */
.factory('DriveService', ['$q',function($q) {
    /**
     * Google Drive item's mime type.
     * @type String
     */
    var driveMime = 'application/restclient+data';
    
    /**
     * @ngdoc method
     * @name DriveService.store
     * @function
     * 
     * @description Store data on Google Drive storage
     * @param {DriveItem} driveItem Data to save as JSON String.
     * 
     *  @example 
     *  DriveService.store(DriveItem);
     *  
     * @returns {$q@call;defer.promise} The promise with {DriveItem} object.
     */
    var store = function(driveItem){
        var deferred = $q.defer();
        throw "Not yet implemented";
        return deferred.promise;
    };
    /**
     * @ngdoc method
     * @name DriveService.restore
     * @function
     * 
     * @description Restore data from Google Drive.
     * @param {DriveObject} driveObject - Drive item info.
     *
     * @example 
     *  DriveService.restore({DriveObject});
     *
     * @return {$q@call;defer.promise} The Promise object. Defered.then() function will return a DriveItem object.
     */
    var restore = function(driveObject){
        var deferred = $q.defer();
        throw "Not yet implemented";
        return deferred.promise;
    };
    
    var service = {
        'store': store,
        'restore': restore
    };
    return service;
}])

/**
 * Service responsible to manage local files.
 */
.factory('DBService', ['$q','$indexedDB',function($q,$indexedDB) {
        
    var store = function(item){
        var deferred = $q.defer();
        if(!item){
            deferred.reject('Can\'t store object in database because object is undefined.');
            return deferred.promise;
        }
        if(['local','history'].indexOf(item.store_location) === -1){
            deferred.resolve(item);
            return deferred.promise;
        }
        
        throw "Not yet implemented";
        return deferred.promise;
    };
    var restore = function(object){
        var deferred = $q.defer();
        throw "Not yet implemented";
        return deferred.promise;
    };
    
    
    var createKey = function(url,method,created){
        var delim = ':';
        var key = method + delim + url;
        if(created){
            key += delim + created;
        }
        return key;
    };
    
    var listHistoryCandidates = function(url,method){
        var deferred = $q.defer();
        var store = $indexedDB.objectStore('request_store');
        var query = $indexedDB.queryBuilder().$index('key').$lt(createKey(url,method)).$asc().compile();
        store.each(query).then(function(cursor){
            deferred.resolve(null);
        }, function(reason){
            
        }, function(cursor){
            
        });
        return deferred.promise;
    };
    
    var service = {
        'store': store,
        'restore': restore,
        'listHistoryCandidates': listHistoryCandidates
    };
    return service;
}])
/**
 * Service responsible to manage local files.
 */
.factory('Filesystem', ['$q','fsHistory', 'UUID',function($q,fsHistory,UUID) {
    /**
     * A directory where all requests objects files are stored.
     * Currently Chrome supports only storing files in root folder (syncFileSystem). Issue has been reported. 
     * @type String
     */
    var directory = '/';
    /**
     * @ngdoc method
     * @name Filesystem.store
     * @function
     * 
     * @description Store data on chrome's syncFilesystem
     * @param {LocalItem} localItem Data to save, as JSON String.
     * 
     * @example 
     *  Filesystem.store(LocalItem);
     * 
     * @returns {$q@call;defer.promise} The promise with {LocalItem} object.
     */
    var store = function(localItem){
        var deferred = $q.defer();
        var fileName = UUID();
        
        fsHistory.set(fileName, localItem.har).then(function(fileEntry){
            deferred.resolve(fileEntry);
        }).catch(function(error){
            console.error('Wrtie history error: ', error);
            deferred.reject(error);
        });
        
        return deferred.promise;
    };
    /**
     * @ngdoc method
     * @name Filesystem.restore
     * @function
     * 
     * @description Restore data from syncFilesystem.
     * @param {FileObject} fileObject - local file item info.
     *
     * @example 
     *  Filesystem.restore(FileObject);
     *
     * @return {$q@call;defer.promise} The Promise object. Defered.then() function will return a LocalItem object.
     */
    var restore = function(fileObject){
        var deferred = $q.defer();
        throw "Not yet implemented";
        return deferred.promise;
    };
    
    var service = {
        'store': store,
        'restore': restore
    };
    return service;
}]);
