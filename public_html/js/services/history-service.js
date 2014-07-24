/* 
 * Copyright 2014 Paweł Psztyć.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @ngname Overview
 * @name arc.history
 * 
 * @description
 * Service responsible for managing history entries.
 * 
 * This service can store new request or update existing one in history store.
 */
angular.module('arc.history', [])
        /**
         * Service responsible to manage local files.
         * 
         * @param {Object} $q Future object
         * @param {Object} $indexedDB Database Service
         */
        .provider('history', function() {
            var module = this;
            //TODO: make it syncable editable.
            var syncable = true;
            //Current, restored file data.
            var current = null;

            module.setSyncable = function(value) {
                syncable = value;
            };

            function toArray(list) {
                return Array.prototype.slice.call(list || [], 0);
            }

            module.$get = ['$q', 'RestConventer', 'UUID', 'DBService', 'Filesystem', 'DriveService', function($q, conventer, uuid, db, fs, ds) {

                    /**
                     * Before actuall store the app must ensure that request 
                     * hasn't change since last call / restoration.
                     * Further it will operate on datastore record that need 
                     * to be valid for current request.
                     * 
                     * @returns {undefined}
                     */
                    var _preSaveHistory = function(data, name, project) {
                        var deferred = $q.defer();

                        if (!_requestEqual(data.request)) {
                            current = null;
                        }

                        if (current === null) {
                            db.restore(db.createKey(data.request.url, data.request.method))
                                    .then(function(restored) {
                                        if (restored) {
                                            current = restored;
                                            current.name = name;
                                            current.project_name = project;
                                        }
                                        deferred.resolve();
                                    })
                                    .catch(function() {
                                        //do nothing
                                    });
                        } else {
                            deferred.resolve();
                        }
                        return deferred.promise;
                    };

                    /**
                     * @ngdoc method
                     * @name history.saveHistory
                     * @function
                     * 
                     * @param {Object} data Request and response object to be stored.
                     * @param {String} name (optional) Request name (if provided by the user).
                     * If undefined existing name will be used (or null for history values).
                     * @param {String} project (optional) Project name to add to.
                     * If undefined existing project name will be used (or null for history values).
                     * 
                     * @description Save request (HAR data) in history/local/sync storage.
                     * 
                     * @returns {$q@call;defer.promise}
                     */
                    function saveHistory(data, name, project) {
                        name = name || null;
                        project = project || null;
                        return _preSaveHistory(data, name, project).then(function() {
                            if (current === null) {
                                current = create_({'type': name ? 'local' : 'history', name: name, project_name: project});
                            }
                            //Timestamp of latest request.
                            current.update = Date.now();
                            conventer.asHar(current.har, data)
                                    .then(function(har) {
                                        current.har = har;
                                        return data;
                                    })
                                    .then(updateHistoryObject_);
                        });
                    }


                    function updateHistoryObject_(data) {
                        
                        if (!current) {
                            throw "No object to update!";
                        }
                        if (!data) {
                            throw "No data passed for update.";
                        }
                        //First save to IndexedDb
                        if (!current.file && !current.drive) {
                            var fileName = uuid();
                            var storeData = {
                                'url': data.request.url,
                                'method': data.request.method,
                                'type': current.type,
                                'project_name': current.project_name,
                                'name': current.name,
                                'file': null,
                                'drive': null
                            };
                            if (current.type === 'drive') {
                                current.drive = storeData.drive = {name: fileName + '.json'};

                            } else {
                                current.file = storeData.file = {name: fileName + '.json'};
                            }
                            return db.store(storeData).then(function(dbid) {
                                current.key = dbid;
                            }).then(updateFile);
                        } else {
                            var toSave = angular.copy(current);
                            delete toSave['har'];
                            return db.store(toSave).then(updateFile);
                        }
                    }

                    function _getStoreService() {
                        var storeService;
                        switch (current.type) {
                            case 'local':
                            case 'history':
                                storeService = fs;
                                break;
                            case 'drive':
                                storeService = ds;
                                break;
                            default:
                                throw "'Unknown store location :('";
                        }
                        return storeService;
                    }

                    function updateFile() {
                        return _getStoreService().store(current, syncable);
                    }

                    /**
                     * Test if given request is equal to current.
                     * It will check only HTTP request data: URL and method.
                     * If headers or payload is different it still mean it is similar
                     * request that can be comparable.
                     * 
                     * @param {Object} other Request and response object.
                     * @returns {Boolean}
                     */
                    function _requestEqual(other) {
                        if (current === null)
                            return false;
                        if (other.url !== current.url) {
                            return false;
                        }
                        if (other.method !== current.method) {
                            return false;
                        }
                        // url, method, 
                        return true;
                    }
                    /**
                     * @ngdoc method
                     * @name history.create
                     * @function
                     * 
                     * @description Create new History object and populate with values.
                     * 
                     * @param {Object} params Initial metadata for object.
                     *  'type' (String), required, - either 'history','local' or 'drive'
                     *  'name' (String), required if [type] is 'local' or 'drive',
                     *  'project_name' (String), optional - Associated project name.
                     * @example 
                     *  history.create({'type': 'local','name':'My request'});
                     * 
                     * @returns {undefined}
                     */
                    var create_ = function(params) {

                        if (!'type' in params) {
                            throw "You must add type (story_location) to create HistoryValue object";
                        }
                        if ((params.type === 'local' || params.type === 'drive') && !params.name) {
                            throw "You must specify file name to create HistoryValue object";
                        }

                        var current = {};
                        current.type = params.type;
                        current.har = null;
                        current.key = null;
                        if (params.name) {
                            current.name = params.name;
                        }
                        if (params.project_name) {
                            current.project_name = params.project_name;
                        }
                        return current;
                    };

                    var restoreHistory = function(url, method) {
                        var key = db.createKey(url, method);
                        return db.restore(key).then(function(restored) {
                            if (!restored)
                                return;

                            current = restored;
                            _restoreFileFromCurrent().then(function(result) {
                                if (!result)
                                    return;
                                current.har = result;
                            });
                        });
                    };
                    /**
                     * This function will restore file object from selected storage.
                     * @returns {undefined}
                     */
                    var _restoreFileFromCurrent = function() {
                        return _getStoreService().restore(current);
                    };

                    var setHistoryFileEntry = function(fileKey, content) {
                        return fs.set(fileKey, content, syncable);
                    };
                    var getHistoryFileEntry = function(fileKey) {
                        return fs.get(fileKey, syncable);
                    };


                    var listHistory = function() {
                        return db.list();
                    };

                    return {
                        save: saveHistory,
                        restore: restoreHistory,
                        'set': setHistoryFileEntry,
                        'get': getHistoryFileEntry,
                        'list': listHistory
                    };
                }];
        });