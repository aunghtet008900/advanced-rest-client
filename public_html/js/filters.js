'use strict';

/* Filters */

angular.module('arc.filters', [])
.filter('interpolate', ['version', function(version) {
        return function(text) {
            return String(text).replace(/\%VERSION\%/mg, version);
        };
    }])
.filter('filesize', [function() {
        return function(text) {
            var value = parseInt(text);
            var units = ['bytes','KB','MB','GB','TB'];
            for(var i=0,len=units.length; i<len;i++){
                if(value < 1024){
                    return (Math.round(value * 100) / 100) + ' ' + units[i];
                }
                value = value/1024;
            }
        };
    }])
.filter('locationheader', [function() {
        return function(headers) {
            for(var i=0, len=headers.length;i<len;i++){
                if(headers[i].name.toLowerCase() === 'location'){
                    return headers[i].value;
                }
            }
            return '[unknown]';
        };
    }])
.filter('historyView', [function() {
        return function(arr, currentView) {
            if(!arr) return;
            if(!currentView) return;
            
            if(currentView === 'history') return arr;
            if(currentView === 'saved') return arr.filter(function(entry){
                if(!entry.name) return false;
                if(entry.type === 'drive') return false;
                return true;
                //entry.name != null && entry.type != drive
            });
            if(currentView === 'drive') return arr.filter(function(entry){
                if(entry.type === 'drive') return true;
                //entry.type == drive
                return false;
            });
        };
}]);