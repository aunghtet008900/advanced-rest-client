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
 * 
 * @todo: this service is not used. To be removed?
 * 
 * @param {Object} $q Future object
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
 * 
 * @param {Object} $q Future object
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
 * 
 * @param {Object} $q Future object
 * @param {Object} $indexedDB Database Service
 */
.factory('DBService', ['$q','$indexedDB',function($q,$indexedDB) {
    /**
     * @ngdoc service
     * @name DBService.store
     * @param {Object} item Item to store.
     * 
     * @description This method is used to add or update existing item to request_store store.
     * If no key provided new will be generated. To do so "url" and "method" keys myst be provided.
     * 
     * @returns {$q@call;defer.promise}
     */
    var store = function(item){
        var deferred = $q.defer();
        if(!item){
            throw 'Can\'t store object in database because object is undefined.';
        }
        
        var requestStore = $indexedDB.objectStore('request_store');
        if(!!!item.key){
            item.key = createKey(item.url, item.method);
            requestStore.insert(item).then(function(){
                deferred.resolve(item.key);
            });
        } else {
            requestStore.upsert(item).then(function(){
                deferred.resolve(item.key);
            });
        }
        
        return deferred.promise;
    };
    var restore = function(key){
        var deferred = $q.defer();
        
        var requestStore = $indexedDB.objectStore('request_store');
//        var query = $indexedDB.queryBuilder().$index('key').$eq(key).compile();
        requestStore.find(key).then(function(result){
            //deferred.resolve(cursor.value);
            deferred.resolve(result);
        });
        return deferred.promise;
    };
    
    
    var createKey = function(url,method){
        if(!url || !method){
            throw "The URL and Method parameter is required to create a key.";
        }
        var delim = ':';
        var key = method + delim + url;
        return key;
    };
    
    var service = {
        'store': store,
        'restore': restore,
        'createKey': createKey
    };
    return service;
}])
/**
 * Service responsible to manage local files.
 * @param {Object} $q Future object
 * @param {Object} fsHistory History Service
 * @param {Object} UUID uuid generator
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
        if(!localItem.file.name){
            throw "Filename not set";
        }
        fsHistory.set(localItem.file.name, localItem.har).then(function(fileEntry){
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
}])
.factory('LocalFs',['$q', function($q){
    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    var storageQuota = 512 * 1024 * 1024;
    /**
     * @ngdoc overvew
     * @name LocalFs.requestFilesystem
     * 
     * @description Request a local filesystem.
     * 
     * @returns {$q@call;defer.promise} Promise will result with
     * DOMFileSystem object.
     */
    var requestFilesystem = function() {
        var defered = $q.defer();
        
        var onInit = function(fs){
            defered.resolve(fs);
        };
        var onError = function(e){
            defered.reject(e);
        };
        
        navigator.webkitPersistentStorage.requestQuota(storageQuota, function(grantedBytes) {
            window.requestFileSystem(window.PERSISTENT, grantedBytes, onInit, onError);
        }, onError);
        return defered.promise;
    };
    /**
     * @ngdoc overvew
     * @name LocalFs.getUsageAndQuota
     * 
     * @description Returns the current usage and quota in bytes for the 
     * local file storage for the app.
     * 
     * 
     * @returns {$q@call;defer.promise} Promise will result with local
     * filesystem usage and quota status. Object will have folowing keys: 
     * - usageBytes (integer) 
     * - quotaBytes (integer) 
     */
    var getUsageAndQuota = function(){
        var defered = $q.defer();

        navigator.webkitPersistentStorage.queryUsageAndQuota(
            function(currentUsageInBytes, currentQuotaInBytes){
                defered.resolve({
                    'usageBytes': currentUsageInBytes,
                    'quotaBytes': currentQuotaInBytes
                });
            }, function(e){
                defered.reject(e);
            });

        return defered.promise;
    };
    /**
     * @ngdoc overvew
     * @name LocalFs.getFileStatus
     * 
     * @description Since local FS doesn't have sync status this function
     * will always return 'synced' (as a fallback to OK result for synced FS)
     * 
     * @param {Object} fileEntry The fileEntry
     * 
     * @returns {$q@call;defer.promise} Promise will result with 'synced'
     * status to be aligned with 'synced' FS as a OK response.
     */
    var getFileStatus = function(fileEntry){
        var defered = $q.defer();
        defered.resolve('synced');
        return defered.promise;
    };
   /**
    * @ngdoc overvew
    * @name LocalFs.getFileStatuses
    * 
    * @description Since local FS doesn't have sync status this function
     * will always return 'synced' for all files in the array (as a fallback 
     * to OK result for synced FS)
    * 
    * @param {Array} fileEntriesArray array of object fileEntries
    * 
    * @returns {$q@call;defer.promise} Promise will result with an array 
    * of objects, where keys are: 
    *  - fileEntry - One of the Entry's originally given to getFileStatuses.
    *  - status - Always 'synced'
    */
   var getFileStatuses = function(fileEntriesArray){
       var defered = $q.defer();
       var result = [];
       for(var i=0, len=fileEntriesArray.length; i<len; i++){
           result[result.length] = {
               'fileEntry': fileEntriesArray[i],
               'status': 'synced'
           };
       }
       return defered.promise;
    };
    /**
     * @ngdoc overvew
     * @name LocalFs.getServiceStatus
     * 
     * @description For local FS this function can only result with 'running' status.
     * 
     * @returns {$q@call;defer.promise} Promise will result with "running" status
     */
    var getServiceStatus = function(){
        var defered = $q.defer();
        defered.resolve('running');
        return defered.promise;
    };
    
    var service = {
        'requestFilesystem': requestFilesystem,
        'getUsageAndQuota': getUsageAndQuota,
        'getFileStatus': getFileStatus,
        'getFileStatuses': getFileStatuses,
        'getServiceStatus': getServiceStatus
    };

    return service;
}])
.factory('SyncableFs',['$q', function($q){
        /**
         * @ngdoc overvew
         * @name SyncableFs.requestFilesystem
         * 
         * @description Returns a syncable filesystem backed by Google Drive. 
         * The returned DOMFileSystem instance can be operated on in the same 
         * way as the Temporary and Persistant file systems 
         * (see http://www.w3.org/TR/file-system-api/), except that 
         * the filesystem object returned for Sync FileSystem does NOT support 
         * directory operations (yet). You can get a list of file entries 
         * by reading the root directory (by creating a new DirectoryReader), 
         * but cannot create a new directory in it.
         * 
         * Calling this multiple times from the same app will return the same 
         * handle to the same file system.
         * 
         * @returns {$q@call;defer.promise} Promise will result with
         * DOMFileSystem object.
         */
        var requestFilesystem = function(){
            var defered = $q.defer();
            chrome.syncFileSystem.requestFileSystem(function(fileSystem){
                if(fileSystem === null){
                    //When user is not signed into chrome 
                    defered.reject(chrome.runtime.lastError);
                    return;
                }
                defered.resolve(fileSystem);
            });
            return defered.promise;
        };
        /**
         * @ngdoc overvew
         * @name SyncableFs.getUsageAndQuota
         * 
         * @description Returns the current usage and quota in bytes for the 
         * 'syncable' file storage for the app.
         * 
         * 
         * @returns {$q@call;defer.promise} Promise will result with 'syncable'
         * filesystem status. Object will have folowwing keys: 
         * - usageBytes (integer) 
         * - quotaBytes (integer) 
         */
        var getUsageAndQuota = function(){
            var defered = $q.defer();
            
            requestFilesystem()
            .then(function(fs){
                chrome.syncFileSystem.getUsageAndQuota(fs, function(info){
                    defered.resolve(info);
                });
            });
            
            return defered.promise;
        };
        /**
         * @ngdoc overvew
         * @name SyncableFs.getFileStatus
         * 
         * @description Returns the FileStatus for the given fileEntry. 
         * 
         * @param {Object} fileEntry The fileEntry
         * 
         * @returns {$q@call;defer.promise} Promise will result with FileStatus: 
         * The status value can be 'synced', 'pending' or 'conflicting'. 
         * Note that 'conflicting' state only happens when the service's 
         * conflict resolution policy is set to 'manual'
         */
        var getFileStatus = function(fileEntry){
            var defered = $q.defer();
            chrome.syncFileSystem.getFileStatus(fileEntry, function(status){
                defered.resolve(status);
            });
            return defered.promise;
        };
        /**
         * @ngdoc overvew
         * @name SyncableFs.getFileStatuses
         * 
         * @description Returns each FileStatus for the given fileEntry array. 
         * Typically called with the result from dirReader.readEntries().
         * 
         * @param {Array} fileEntriesArray array of object fileEntries
         * 
         * @returns {$q@call;defer.promise} Promise will result with an array 
         * of objects, where keys are: 
         *  - fileEntry - One of the Entry's originally given to getFileStatuses.
         *  - status - The status value can be 'synced', 'pending' or 'conflicting'.
         *  - error (optional) - Optional error that is only returned if there 
         *      was a problem retrieving the FileStatus for the given file.
         */
        var getFileStatuses = function(fileEntriesArray){
            var defered = $q.defer();
            chrome.syncFileSystem.getFileStatuses(fileEntriesArray, function(statusesArray){
                defered.resolve(statusesArray);
            });
            return defered.promise;
        };
        /**
         * @ngdoc overvew
         * @name SyncableFs.getServiceStatus
         * 
         * @description Returns the current sync backend status.
         * 
         * @returns {$q@call;defer.promise} Promise will result with one of 
         * states: "initializing", "running", "authentication_required", 
         * "temporary_unavailable", or "disabled"
         */
        var getServiceStatus = function(){
            var defered = $q.defer();
            chrome.syncFileSystem.getServiceStatus(function(status){
                defered.resolve(status);
            });
            return defered.promise;
        };
        
        var service = {
            'requestFilesystem': requestFilesystem,
            'getUsageAndQuota': getUsageAndQuota,
            'getFileStatus': getFileStatus,
            'getFileStatuses': getFileStatuses,
            'getServiceStatus': getServiceStatus
        };
        
        return service;
}]);
