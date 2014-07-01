var DB_VERSION = 3;

/**
 * Listen for app install, app update or chrome update.
 * In case of install, create database schema and set
 * initianal settings.
 * @param {Object} details
 */
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('onInstalled', details);
    var action;
    var clb = function() {
        if (!!action) {
            action = null;
        }
    };
    switch (details.reason) {
        case 'install':
            action = new AppInstaller().install(clb);
            break;
        case 'update':
            action = new AppInstaller().upgrade(details.previousVersion, clb);
            action = null;
            break;
        case 'chrome_update':
            break;
    }
});



chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('build.html', {
        'id': 'arcMainWindow',
        'minWidth': 1280,
        'minHeight': 800
    });
});






function AppInstaller() {
    this.installComplete = function() {
    };
}
AppInstaller.prototype = {
    constructor: AppInstaller,
    install: function(installComplete) {
        console.warn('Thank you for choosing Advanced Rest Client :)');
        console.warn('Now I\'m installing');

        this.installComplete = installComplete;
        this._doInstall();
        return this;
    },
    upgrade: function(previousVersion, installComplete) {
        console.warn('Thank you for choosing Advanced Rest Client :)');
        console.warn('Now I\'m upgrading');

        this._doUpgrade(installComplete);

        return this;
    },
    _doUpgrade: function(realCallback) {
        //set local storage
        //first check if there is synced values

        ///items stored in sync already by prev version
        var syncValues = {
            CMH_ENABLED: null,
            CMP_ENABLED: null,
            DEBUG_ENABLED: null, //key to delete
            MAGICVARS_ENABLED: null,
            NOTIFICATIONS_ENABLED: null
        };
        var context = this;
        chrome.storage.sync.get(syncValues, function(data) {

            var oldValues = {
                SHORTCUTS: null,
                tutorials: null
            };

            chrome.storage.local.get(oldValues, function(oldData) {
                var shortcutsList = [{"cmd": ["ctrl+o", "command+o"], "action": "OPEN_REQUEST"}, {"cmd": ["command+s", "ctrl+s"], "action": "SAVE_REQUEST"}];
                var localShortcuts = null;
                if (!!oldData.SHORTCUTS) {
                    try {
                        localShortcuts = JSON.parse(oldData.SHORTCUTS);
                        shortcutsList = [];
                        for (var i = 0, len = localShortcuts.length; i < len; i++) {
                            var current = localShortcuts[i];
                            if (!current.t)
                                continue;
                            var cmd = "";
                            if (current.a) {
                                cmd += "alt+";
                            }
                            if (current.c) {
                                cmd += "ctrl+";
                            }
                            if (current.a) {
                                cmd += "shift+";
                            }
                            cmd += String.fromCharCode(current.k);
                            shortcutsList[shortcutsList.length] = {
                                "action": current.t,
                                "cmd": cmd
                            };
                        }
                    } catch (e) {
                    }
                }
                var syncValuesSet = {
                    'SHORTCUTS': shortcutsList,
                    'tutorials': !!oldData.tutorials ? null : oldData.tutorials
                };

                chrome.storage.sync.set(syncValuesSet, function() {
                    console.log('Sync storage values set.');
                });

//                context.installComplete = function() {
//                    //TODO: copy data from WebSQL to FileSystem.
//                    realCallback.call(context);
//                };
//                
//                context._addAssetsToDb();
                realCallback.call(context);
            });

        });
    },
    _doInstall: function() {
        //shortcuts: ["cmd":["shortcuts list like: ctrl+s"], "action":"OPEN_REQUEST"]
        var syncValuesSet = {
            'SHORTCUTS': [{"cmd": ["ctrl+o", "command+o"], "action": "OPEN_REQUEST"}, {"cmd": ["command+s", "ctrl+s"], "action": "SAVE_REQUEST"}],
            'tutorials': null
        };

        chrome.storage.sync.set(syncValuesSet, function() {
            console.log('Sync storage values set.');
        });
        this.installComplete();
    }
//    
//    _initializeDatabases: function() {
//        var context = this;
//        var callbacksCount = 2;
//        var callback = function() {
//            this.installComplete();
//        };
//
//        new IDBStore({
//            dbVersion: DB_VERSION,
//            storeName: 'history',
//            keyPath: 'historyid',
//            autoIncrement: true,
//            onStoreReady: function() {
//                callbacksCount--;
//                if (callbacksCount === 0) {
//                    callback.call(context);
//                }
//            },
//            indexes: [
//                {name: 'url', keyPath: 'url', unique: false, multiEntry: false},
//                {name: 'time', keyPath: 'time', unique: true, multiEntry: false}
//            ]
//        });
//        new IDBStore({
//            dbVersion: DB_VERSION,
//            storeName: 'requests',
//            keyPath: 'requestid',
//            autoIncrement: true,
//            onStoreReady: function() {
//                callbacksCount--;
//                if (callbacksCount === 0) {
//                    callback.call(context);
//                }
//            },
//            indexes: [
//                {name: 'url', keyPath: 'url', unique: false, multiEntry: false},
//                {name: 'time', keyPath: 'time', unique: true, multiEntry: false},
//                {name: 'project', keyPath: 'project', unique: false, multiEntry: false},
//                {name: 'name', keyPath: 'name', unique: false, multiEntry: false}
//            ]
//        });
//    }
};

var CLIENT_ID = '10525470235.apps.googleusercontent.com';