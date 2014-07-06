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

    module.setSyncable = function(value){
        syncable = value;
    };

    function toArray(list) {
        return Array.prototype.slice.call(list || [], 0);
    }
    
    module.$get = ['$q','RestConventer','UUID','DBService','Filesystem','DriveService', function($q,conventer,uuid,db,fs,ds){
        
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
        function saveHistory(data, name, project){
            name = name || null;
            project = project || null;
            
            if(!_requestEqual(data.request)){
                current = null;
            }
            
            if(current === null){
                current = create_({'store_location': name ? 'local':'history', name: name, project_name: project});
            }
            
            var defered = $q.defer();
            
            conventer.asHar(current.har, data)
            .then(function(har){
                current.har = har;
                return data;
            })
            .then(updateHistoryObject_);
            
            
            return defered.promise;
        }
        
        
        function updateHistoryObject_(data){
            if(!current){
                throw "No object to update!";
            }
            if(!data){
                throw "No data passed for update.";
            }
//            
//            window.console.log('updateHistoryObject_', data);
//            
            //First save to IndexedDb
            if(!current.file && !current.drive){
                var fileName = uuid();
                var storeData = {
                    'url': data.request.url,
                    'method': data.request.method,
                    'type': current.store_location,
                    'project_name': current.project_name,
                    'name': current.name,
                    'file': null,
                    'drive': null
                };
                if(current.store_location === 'drive'){
                    current.drive = storeData.drive = {name: fileName + '.json'};
                    
                } else {
                    current.file = storeData.file = {name: fileName + '.json'};
                }
                return db.store(storeData).then(function(dbid){
                    window.console.log('insert key: ', dbid);
                    current.key = dbid;
                }).then(updateFile);
            }
            
            return updateFile();
        }
        
        
        function updateFile(){
            var storeService;
            switch(current.store_location){
                case 'local': 
                case 'history': storeService = fs; break;
                case 'drive': storeService = ds; break;
                default:
                    throw "'Unknown store location :('";
            }
            var defered = $q.defer();
            storeService.store(current)
            .then(function(result){
                defered.resolve(result);
            })
            .catch(function(reason){
                defered.reject(reason);
            });
            return defered.promise;
        }
        
        /**
         * Test if given request is equal to current.
         * It will check only HTTP request data
         * @param {Object} other Request and response object.
         * @returns {Boolean}
         */
        function _requestEqual(other){
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
         *  'store_location' (String), required, - either 'history','local' or 'drive'
         *  'name' (String), required if [store_location] is 'local' or 'drive',
         *  'project_name' (String), optional - Associated project name.
         * @example 
         *  history.create({'store_location': 'local','name':'My request'});
         * 
         * @returns {undefined}
         */
        var create_ = function(params){
            
            if(!'store_location' in params){
                throw "You must add store_location to create HistoryValue object";
            }
            if((params.store_location === 'local' || params.store_location === 'drive') && !params.name){
                throw "You must specify file name to create HistoryValue object";
            }
            
            var current = {};
            current.store_location = params.store_location;
            current.har = null;
            current.key = null;
            if(params.name){
                current.name = params.name;
            }
            if(params.project_name){
                current.project_name = params.project_name;
            }
            return current;
        };
        
        var restoreHistory = function(url, method){
            var key = db.createKey(url, method);
            return db.restore(key).then(function(restored){
                if(!restored) return;
                
                current = restored;
                current.store_location = restored.type;
            });
        };
        
        return {
            save: saveHistory,
            restore: restoreHistory
        };
    }];
});