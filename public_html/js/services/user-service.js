/**
 * @ngname Overview
 * @name arc.userService
 * 
 * @description
 * Service responsible for user account and authorization on Google Drive.
 */
angular.module('arc.userService', [])
.factory('$User', ['$q','$timeout','$http','$rootScope', function($q, $timeout, $http, $rootScope) {
    var FOLDERNAME = 'userimage', access_token = null;
    
    function _getUserData() {
        
        $http.get('https://www.googleapis.com/userinfo/v2/me', {
            'headers': {
                'Authorization': 'Bearer ' + access_token
            },
            'cache': true
        })
        .success(function(user) {
            if (!user) return;
            service.user_info = {
                google_id: null, //user.id, TODO: do I need this information?
                name: user.name, //full name to display to the user so he/she will know as who is he/she logged in
                picture: user.picture, //user's picture from G+ (or just profile). It will be displayed in the app.
                picture_object_url: null, //objectURL for the picture
                locale: user.locale //use user's locale info fo the app.
            };
            getProfileImage();
        })
        .error(function(data) {
            if(data.error.code === 401){
                service.loggedin = false;
                service.clearCache();
            }
        });
    }

    function getProfileImage() {
        if (!service.user_info.picture || service.user_info.picture_object_url)
            return;
        var ext = service.user_info.picture.substr(service.user_info.picture.lastIndexOf('.') + 1);
        var filename = service.user_info.picture.substr(service.user_info.picture.indexOf('/', 8) + 1);
        filename = filename.substr(0, filename.lastIndexOf('/'));
        filename = filename.replace(/\//g, '_') + '.' + ext;
        window.webkitRequestFileSystem(PERSISTENT, 1024 * 1024, function(fs) {
            var fsURL = fs.root.toURL() + FOLDERNAME + '/' + filename;
            window.webkitResolveLocalFileSystemURL(fsURL, function(entry) {
                service.user_info.picture_object_url = entry.toURL();
                $rootScope.$digest();
            }, function() {
                $http.get(service.user_info.picture, {
                    responseType: 'blob'
                }).success(function(blob) {
                    blob.name = filename;
                    writePicFile(fs, blob);
                    service.user_info.picture_object_url = window.URL.createObjectURL(blob);
                });
            });
        }, function(reason) {
            //TODO: error handling
        });
    }

    function writePicFile(fs, blob) {
        
        var deferred = $q.defer();
        
        var onError = function(e) {
            console.warn('Error write user\'s thumbnail in filesystem', e);
            deferred.reject(e);
        };
        fs.root.getDirectory(FOLDERNAME, {create: true}, function(dirEntry) {
            dirEntry.getFile(blob.name, {create: true, exclusive: false}, function(fileEntry) {
                // Create a FileWriter object for our FileEntry, and write out blob.
                fileEntry.createWriter(function(fileWriter) {
                    fileWriter.onerror = onError;
                    fileWriter.onwriteend = function(e) {
                        console.log('Write user\'s thumbnail completed.', e);
                        deferred.resolve();
                    };
                    fileWriter.write(blob);
                }, onError);
            }, onError);
        }, onError);
        
        return deferred.promise;
    }
    
    function restore(){
        service.authorize(false).then(function(access_token){
            if(!access_token) return;
            
            $http.get('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token='+access_token, {
                'cache': false
            })
            .success(function(token_info) {
                if(!token_info) return;
                if(token_info.expires_in <= 0){
                    service.clearCache();
                    service.loggedin = false;
                }
            });
        });
    }
    
    
    var service = {
        loggedin: false,
        user_info: {
            google_id: null, //TODO: do I need this information?
            name: null, //full name to display to the user so he/she will know as who is he/she logged in
            picture: null, //user's picture from G+ (or just profile). It will be displayed in the app.
            picture_object_url: null, //objectURL for the picture
            locale: 'en' //use user's locale info fo the app.
        },
        'authorize': function(interactive){
            if (typeof interactive !== 'boolean')
                interactive = true;

            var deferred = $q.defer();
            try {
                chrome.identity.getAuthToken({interactive: interactive}, function(token) {
                    access_token = token;
                    if(token){
                        service.loggedin = true;
                        $timeout(_getUserData.bind(this), 0);
                    } else {
                        service.loggedin = false;
                    }
                    deferred.resolve(token);
                }.bind(this));
            } catch (e) {
                deferred.reject(e.message);
            }
            return deferred.promise;
        },
        /**
         * The user is authorized (has auth token) only if:
         * - has access token 
         * 
         * Note that the token might be revoked by the user in account settings so even if token here looks OK it might be invalid.
         * 
         * @returns {Boolean} True if has valid access token.
         */
        'isAuthorized': function(){
            if(!access_token) return false;
            return true;
        },
        'removeToken': function(){
            var deferred = $q.defer();
            $http.get('https://accounts.google.com/o/oauth2/revoke?token='+access_token).success(function() {
                service.clearCache().then(function(){
                    service.loggedin = false;
                    deferred.resolve();
                });
            });
            return deferred.promise;
        },
        'clearCache': function(){
            var deferred = $q.defer();
            chrome.identity.removeCachedAuthToken({
                token: access_token
            }, function() {
                access_token = null;
                deferred.resolve();
            }.bind(this));
            return deferred.promise;
        }
    };
    
    $timeout(restore,0);
    
    return service;
}]);