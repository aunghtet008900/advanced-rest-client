/**
 * @ngname Overview
 * @name arc.responsepService
 * 
 * @description
 * Service providing utilities methods for HTTP response..
 */
angular.module('arc.persistantService', [])
        /**
         * Service responsible to manage Drive files.
         * 
         * @param {Object} $q Future object
         */
        .factory('DriveService', ['$q', function($q) {
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
                var store = function(driveItem) {
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
                var restore = function(driveObject) {
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
        .factory('DBService', ['$q', '$indexedDB', function($q, $indexedDB) {
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
                var store = function(item) {
                    var deferred = $q.defer();
                    if (!item) {
                        throw 'Can\'t store object in database because object is undefined.';
                    }

                    var requestStore = $indexedDB.objectStore('request_store');
                    if (!!!item.key) {
                        item.key = createKey(item.url, item.method);
                        
                        requestStore.insert(item).then(function() {
                            deferred.resolve(item.key);
                        });
                    } else {
                        requestStore.upsert(item).then(function() {
                            deferred.resolve(item.key);
                        });
                    }
                    return deferred.promise;
                };
                var restore = function(key) {
                    var requestStore = $indexedDB.objectStore('request_store');
                    return requestStore.find(key);
                };


                var createKey = function(url, method) {
                    if (!url || !method) {
                        throw "The URL and Method parameter is required to create a key.";
                    }
                    var delim = ':';
                    var key = method + delim + url;
                    return key;
                };
                
                var list = function(){
                    return $indexedDB.objectStore('request_store').getAll();
                };
                
                var service = {
                    'store': store,
                    'restore': restore,
                    'createKey': createKey,
                    'list': list
                };
                return service;
            }])
        /**
         * Service responsible to manage local files.
         * @param {Object} $q Future object
         */
        .factory('Filesystem', ['$q', 'LocalFs', 'SyncableFs', function($q, LocalFs, SyncableFs) {

                function _getFactory(syncable) {
                    return syncable ? SyncableFs : LocalFs;
                }

                /**
                 * 
                 * @ngdoc method
                 * @name Filesystem.getFile
                 * @function
                 * 
                 * @description Read file from storage.
                 * @param {String} filename File to restore.
                 * @param {bool} syncable True if file should be found in syncable storage.
                 * 
                 * @example 
                 *  Filesystem.getFile('file.json', true).then(function(fileEntry){});
                 * 
                 * @returns {$q@call;defer.promise} The promise with {FileEntry} object.
                 */
                var getFile = function(filename, syncable) {
                    var defered = $q.defer();
                    _getFactory(syncable).requestFilesystem()
                            .then(function(fs) {
                                fs.root.getFile(filename, {create: true}, function(fileEntry) {
                                    defered.resolve(fileEntry);
                                }, function(error) {
                                    defered.reject(error);
                                });
                            })
                            .catch(function(reason) {
                                if (syncable && reason && reason.message
                                        && reason.message.indexOf("error code: -107") > 0) {
                                    return getFile(filename, false);
                                }
                                defered.reject(reason);
                            });
                    return defered.promise;
                };
                /**
                 * Read file contents.
                 * @param {FileEntry} fileEntry
                 * @returns {$q@call;defer.promise}
                 */
                var readFile = function(fileEntry) {
                    var defered = $q.defer();
                    fileEntry.file(function(file) {
                        var reader = new FileReader();
                        reader.onloadend = function(e) {
                            defered.resolve(this.result);
                        };
                        reader.onerror = function(error) {
                            defered.reject(error);
                        };
                        reader.readAsText(file);
                    }, function(error) {
                        defered.reject(error);
                    });
                    return defered.promise;
                };
                /**
                 * Shorthand method to read file content.
                 * @param {type} filename
                 * @param {bool} syncable True if file should be found in syncable storage.
                 * @returns {$q@call;defer.promise}
                 */
                var getFileContents = function(filename, syncable) {
                    return getFile(filename, syncable)
                            .then(readFile);
                };

                /**
                 * 
                 * @param {FileEntry|String} file Either FileEntry or file name.
                 * @param {bool} syncable True if file should be found in syncable storage.
                 * @param {String} data Data to be written
                 * @param {String} mime File mime type.
                 * 
                 * @returns {$q@call;defer.promise}
                 */
                var writeFile = function(file, syncable, data, mime) {
                    if (typeof file !== 'string') {
                        return writeFileEntry(file, data, mime);
                    }

                    return getFile(file, syncable)
                            .then(truncate)
                            .then(function() {
                                return getFile(file, syncable);
                            })
                            .then(function(fileEntry) {
                                return writeFileEntry(fileEntry, data, mime);
                            });
                };
                /**
                 * Write data to the file.
                 * @param {FileEntry} fileEntry FileEntry for write to
                 * @param {String|ArrayBuffer} data Data to write
                 * @param {type} mime Files mime type.
                 * @returns {$q@call;defer.promise}
                 */
                var writeFileEntry = function(fileEntry, data, mime) {
//                    console.log('writeFileEntry', fileEntry, data, mime);
                    var defered = $q.defer();
                    fileEntry.createWriter(function(fileWriter) {
                        fileWriter.onwriteend = function(e) {
                            defered.resolve(fileEntry);
                        };
                        fileWriter.onerror = function(e) {
                            defered.reject(e);
                        };
                        var toWrite;
                        if (typeof data === 'string') {
                            toWrite = [data];
                        } else {
                            toWrite = data;
                        }
                        var blob = new Blob(toWrite, {type: mime});
                        fileWriter.write(blob);
                    }, defered.reject);
                    return defered.promise;
                };

                var truncate = function(fileEntry) {
                    var defered = $q.defer();
                    fileEntry.createWriter(function(fileWriter) {
                        fileWriter.onwriteend = function(e) {
                            defered.resolve();
                        };
                        fileWriter.onerror = function(e) {
                            defered.reject(e);
                        };
                        fileWriter.truncate(0);
                    }, defered.reject);
                    return defered.promise;
                };

                var deleteFile = function(fileEntry) {
                    var defered = $q.defer();
                    fileEntry.remove(defered.resolve, defered.reject);
                    return defered.promise;
                };

                var listHistory = function(syncable) {
                    var defered = $q.defer();
                    //get all files started with 'h_';
                    _getFactory(syncable).requestFilesystem()
                            .then(function(fs) {
                                var dirReader = fs.root.createReader();
                                var entries = [];
                                var readEntries = function() {
                                    dirReader.readEntries(function(results) {
                                        if (!results.length) {
                                            defered.resolve(entries.sort());
                                        } else {
                                            entries = entries.concat(toArray(results));
                                            readEntries();
                                        }
                                    }, defered.reject);
                                };
                                readEntries();
                            });

                    return defered.promise;
                };

                var getHistoryEntry = function(fileKey, syncable) {
                    var filename = 'h_' + fileKey;
                    return getFileContents(filename, syncable);
                };

                var setHistoryEntry = function(fileKey, content, syncable) {
                    if ((typeof fileKey === 'string') && fileKey.indexOf('h_') !== 0) {
                        fileKey = 'h_' + fileKey;
                    }
                    if (typeof content !== 'string') {
                        content = JSON.stringify(content);
                    }
                    return writeFile(fileKey, syncable, content, 'application/json');
                };

                var removeHistoryEntry = function(fileKey, syncable) {
                    if ((typeof fileKey === 'string') && fileKey.indexOf('h_') !== 0) {
                        fileKey = 'h_' + fileKey;
                    }
                    return getFile(fileKey, syncable).then(function(fileEntry) {
                        return deleteFile(fileEntry);
                    });
                };

                /**
                 * @ngdoc method
                 * @name Filesystem.store
                 * @function
                 * 
                 * @description Store data on chrome's syncFilesystem
                 * @param {LocalItem} localItem Data to save, as JSON String.
                 * @param {bool} syncable True if file should be found in syncable storage.
                 * 
                 * @example 
                 *  Filesystem.store(LocalItem);
                 * 
                 * @returns {$q@call;defer.promise} The promise with {LocalItem} object.
                 */
                var store = function(localItem, syncable) {
//                    console.group('store');
//                    console.log('localItem', localItem);
//                    console.log('syncable', syncable);
//                    console.groupEnd();
                    if (!localItem.file.name) {
                        throw Error("Filename not set");
                    }
                    return setHistoryEntry(localItem.file.name, localItem.har, syncable);
                };
                /**
                 * @ngdoc method
                 * @name Filesystem.restore
                 * @function
                 * 
                 * @description Restore data from syncFilesystem.
                 * @param {FileObject} fileObject - local file item info.
                 * @param {bool} syncable True if file should be found in syncable storage.
                 *
                 * @example 
                 *  Filesystem.restore(FileObject);
                 *
                 * @return {$q@call;defer.promise} The Promise object. Defered.then() function will return a LocalItem object.
                 */
                var restore = function(fileObject, syncable) {
                    if (!(fileObject.file && fileObject.file.name)) {
                        throw Error("Object does not contain file info.");
                    }
                    
                    return getHistoryEntry(fileObject.file.name, syncable).then(function(data){
                        if(!data || data.trim() === ''){
                            return null;
                        }
                        return JSON.parse(data);
                    });
                };

                var service = {
                    'store': store,
                    'restore': restore,
                    'set': setHistoryEntry,
                    'get': getHistoryEntry,
                    'list': listHistory,
                    'remove': removeHistoryEntry
                };
                return service;
            }])
        .factory('LocalFs', ['$q', function($q) {
                window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
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

                    var onInit = function(fs) {
                        defered.resolve(fs);
                    };
                    var onError = function(e) {
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
                var getUsageAndQuota = function() {
                    var defered = $q.defer();

                    navigator.webkitPersistentStorage.queryUsageAndQuota(
                            function(currentUsageInBytes, currentQuotaInBytes) {
                                defered.resolve({
                                    'usageBytes': currentUsageInBytes,
                                    'quotaBytes': currentQuotaInBytes
                                });
                            }, function(e) {
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
                var getFileStatus = function(fileEntry) {
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
                var getFileStatuses = function(fileEntriesArray) {
                    var defered = $q.defer();
                    var result = [];
                    for (var i = 0, len = fileEntriesArray.length; i < len; i++) {
                        result[result.length] = {
                            'fileEntry': fileEntriesArray[i],
                            'status': 'synced'
                        };
                    }
                    defered.resolve(result);
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
                var getServiceStatus = function() {
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
        .factory('SyncableFs', ['$q', function($q) {
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
                var requestFilesystem = function() {
                    var defered = $q.defer();
                    chrome.syncFileSystem.requestFileSystem(function(fileSystem) {
                        if (fileSystem === null) {
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
                var getUsageAndQuota = function() {
                    var defered = $q.defer();

                    requestFilesystem()
                            .then(function(fs) {
                                chrome.syncFileSystem.getUsageAndQuota(fs, function(info) {
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
                var getFileStatus = function(fileEntry) {
                    var defered = $q.defer();
                    chrome.syncFileSystem.getFileStatus(fileEntry, function(status) {
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
                var getFileStatuses = function(fileEntriesArray) {
                    var defered = $q.defer();
                    chrome.syncFileSystem.getFileStatuses(fileEntriesArray, function(statusesArray) {
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
                var getServiceStatus = function() {
                    var defered = $q.defer();
                    chrome.syncFileSystem.getServiceStatus(function(status) {
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
