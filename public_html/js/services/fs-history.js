/* 
 * Copyright 2014 jarrod.
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


angular.module('arc.fsHistory', [])
.provider('fsHistory', function() {
    var module = this;
    var syncable = true;

    module.setSyncable = function(value){
        syncable = value;
    };

    function toArray(list) {
        return Array.prototype.slice.call(list || [], 0);
    }
    
    module.$get = ['$q', 'LocalFs', 'SyncableFs', function($q, LocalFs, SyncableFs){
            
        Object.defineProperty(module, 'factory', {
            get: function() {
                return syncable ? SyncableFs : LocalFs;
            }
        });
            
        var getFile = function(filename){
            var defered = $q.defer();
            module.factory.requestFilesystem()
            .then(function(fs){
                fs.root.getFile(filename, {create: true}, function(fileEntry) {
                    defered.resolve(fileEntry);
                }, function(error){
                    defered.reject(error);
                });
            })
            .catch(defered.reject);
            return defered.promise;
        };

        var readFile = function(fileEntry){
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
            }, function(error){
                defered.reject(error);
            });
            return defered.promise;
        };

        var getFileContents = function(filename){
            var defered = $q.defer();
            getFile(filename)
            .then(readFile)
            .then(function(data){
                defered.resolve(data);
            })
            .catch(defered.reject);
            return defered.promise;
        };
        /**
         * 
         * @param {FileEntry|String} file Either FileEntry or name.
         * @returns {$q@call;defer.promise}
         */
        var writeFile = function(file, data, mime){
            if(typeof file !== 'string'){
                return writeFileEntry(file, data, mime);
            }

            var defered = $q.defer();
            getFile(file)
            .then(truncate)
            .then(function(){
                return getFile(file);
            })
            .then(function(fileEntry){
                return writeFileEntry(fileEntry, data, mime);
            })
            .then(defered.resolve)
            .catch(defered.reject);

            return defered.promise;
        };
        /**
         * 
         * @param {FileEntry} fileEntry FileEntry for write to
         * @param {String|ArrayBuffer} data Data to write
         * @param {type} mime Files mime type.
         * @returns {$q@call;defer.promise}
         */
        var writeFileEntry = function(fileEntry, data, mime){
            var defered = $q.defer();
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function(e) {
                    defered.resolve(fileEntry);
                };
                fileWriter.onerror = function(e) {
                    defered.reject(e);
                };
                var toWrite;
                if(typeof data === 'string'){
                    toWrite = [data];
                } else {
                    toWrite = data;
                }
                var blob = new Blob(toWrite, {type: mime});
                fileWriter.write(blob);
            }, defered.reject);
            return defered.promise;
        };
        
        var truncate = function(fileEntry){
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

        var deleteFile = function(fileEntry){
            var defered = $q.defer();
            fileEntry.remove(defered.resolve,defered.reject);
            return defered.promise;
        };


        //
        // Factory functions.
        //
        var listHistory = function(){
            var defered = $q.defer();
            //get all files started with 'h_';
            module.factory.requestFilesystem()
            .then(function(fs){
                var dirReader = fs.root.createReader();
                var entries = [];
                var readEntries = function() {
                    dirReader.readEntries (function(results) {
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

        var getHistoryEntry = function(fileKey){
            var defered = $q.defer();
            var filename = 'h_' + fileKey;
            getFileContents(filename)
            .then(function(data){
                defered.resolve(data);
            })
            .catch(defered.reject);
            return defered.promise;
        };

        var setHistoryEntry = function(fileKey, content){
            if((typeof fileKey === 'string') && fileKey.indexOf('h_') !== 0){
                fileKey = 'h_' + fileKey;
            }
            if(typeof content !== 'string'){
                content = JSON.stringify(content);
            }

            var defered = $q.defer();
            writeFile(fileKey, content, 'application/json')
            .then(defered.resolve)
            .catch(defered.reject);
            return defered.promise;
        };

        var removeHistoryEntry = function(fileKey){
            if((typeof fileKey === 'string') && fileKey.indexOf('h_') !== 0){
                fileKey = 'h_' + fileKey;
            }
            var defered = $q.defer();
            getFile(fileKey).then(function(fileEntry){
                return deleteFile(fileEntry);
            }).then(defered.resolve).catch(defered.reject);
            return defered.promise;
        };

        return {
            'list': listHistory,
            'get': getHistoryEntry,
            'set': setHistoryEntry,
            'remove': removeHistoryEntry
        };
    }];
});