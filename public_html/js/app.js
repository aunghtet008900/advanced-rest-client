'use strict';

String.prototype.isEmpty = function() {
    return (this.trim() === "");
};

/* App Module */

var RestClient = angular.module('RestClient', [
    'goog.analytics',
    'ngRoute',
    'ngAnimate',
    'ngSanitize',
    'ngTouch',
    'arc.filters',
    'arc.services',
    'arc.directives',
    'arc.modules',
    'arc.controllers',
    'arc.converter',
    'arc.fsHistory',
    'arc.cmService',
    'arc.httpService',
    'arc.responsepService',
    'arc.userService',
    'arc.persistantService',
    'arc.valuesService',
    'arc.history',
    'ui.bootstrap',
    'ui.codemirror',
    'xc.indexedDB',
    'chrome.http'
]);

RestClient.value('version', '0.1');

RestClient.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/socket', {
        templateUrl: 'views/pages/socket.html',
        controller: 'SocketController'
      }).
      when('/history', {
        templateUrl: 'views/pages/history.html',
        controller: 'HistoryController'
      }).
      when('/request', {
        templateUrl: 'views/pages/request.html',
        controller: 'RequestController'
      }).
      when('/settings', {
        templateUrl: 'views/pages/settings.html',
        controller: 'SettingsController'
      }).
      otherwise({
        redirectTo: '/request'
      });
  }]);
RestClient.config(function ($indexedDBProvider) {
      
      $indexedDBProvider
        .connection('arc_store')
        .upgradeDatabase(4, function(event, db, tx){
            console.log('aaaa');
            try{
                db.deleteObjectStore('request_store');
            } catch(e){};
            ///Key for this store must be generated manually and added to object before save.
            ///In case of this application a key is an combination of HTTP method and the URL.
            ///Key's schema: HTTP method + ":" + request url
            var objStore = db.createObjectStore('request_store', {keyPath: 'key'}); //KEY MUST BE GENERATED MANUALLY
            objStore.createIndex('url_idx', 'url', {unique: false, multiEntry: false}); //request URL
            objStore.createIndex('file_idx', 'file.name', {unique: true, multiEntry: false}); //FileObject, present only if type is equal 'local'
            objStore.createIndex('drive_idx', 'drive.id', {unique: true, multiEntry: false}); //DriveObject, present only if type is equal 'drive'
            objStore.createIndex('type_idx', 'type', {unique: false, multiEntry: false}); //entry type: 'local','history','drive'
            objStore.createIndex('project_idx', 'project_name', {unique: false, multiEntry: false});
            objStore.createIndex('name_idx', 'name', {unique: false, multiEntry: false}); //request name, undefined for history
        });
  });
  
RestClient.constant('APP_EVENTS', {
    ERROR_OCCURED: 'app-error-occured',
    START_REQUEST: 'app-request-start',
    END_REQUEST: 'app-request-end',
    REQUEST_ERROR: 'app-request-error'
});
RestClient.config(function(analyticsProvider){
    analyticsProvider.setClientId('UA-18021184-9');
});
RestClient.config(function(historyProvider){
    historyProvider.setSyncable(true);
});