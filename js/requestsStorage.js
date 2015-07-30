
/**
 * This object store Request related data
 * like history, request itself, project data or response for request
 * @param {Object} appStorage Reference to apps storage object.
 * @returns {Object}
 */
function RequestsStorage(appStorage){
    this.appStore = appStorage;
    this._worker = null;
    this.proxydata = {};
}
RequestsStorage.prototype = {
    constructor: RequestsStorage,
    
    get worker(){
        if(this._worker === null){
            this._worker = new Worker(chrome.runtime.getURL('js/workers/historystore.js'));
            this._worker.addEventListener('message', this._onMessage.bind(this), false);
        }
        return this._worker;
    },
    
    someId: function (){
        return window.performance.now();
    },
    
    _onMessage: function(e){
        var msg = e.data.msg,
            id = e.data.id;
        if(!id) return;
        var appData = this.proxydata[id];
        if(!appData) return;
        delete this.proxydata[id];
        
        switch (msg) {
            case 'savehistory':
                appData.clb.call(window, e.data.data);
            break;
            case 'savehistoryresponse':
                appData.clb.call(window, e.data.data);
            break;
        }
    },
    
    /**
     * Store request in history storage.
     * If the request already exist in the store it only updates its counter.
     * 
     * Use request counter to determine order in URL's suggestions field.
     * 
     * @param {Object} requestData - The request data to save. Only required parameter is the URL.
     * @param {Function} clb - callback function to call after save. It will handle one 
     * @returns {Void}
     */
    saveHistory: function(requestData, clb){
        if(typeof clb !== 'function'){
            clb = function(){};
        }
        var id =  this.someId();
        this.proxydata[id] = {
            'clb': clb
        };
        this.worker.postMessage({cmd: 'savehistory', 'requestData': requestData, 'id': id});
    },
    
    /**
     * Save response data in indexed DB.
     * @param {Number} historyId - Required ID of the history object.
     * @param {Object|RequestObject} responseData - response data to save
     *      it accepts object with following keys:
     *      "ERROR" - 
     *      "REDIRECT_DATA" - array of redirect objects
     *      "REQUEST_HEADERS" - array of objects with "key", "name" keys
     *      "RESPONSE_HEADERS" - array of objects with "key", "name" keys
     *      "URL" - final (after all redirects!) url
     *      "requestedUrl" - an URL from user input
     *      "response" - String with response
     *      "status" - int response status
     *      "statusText" - String response status text.
     * @param {Number} responseLoadTime Time in miliseconds
     * @param {type} callback
     * @returns {undefined}
     */
    saveHistoryResponse: function(historyId, responseData, responseLoadTime, callback){
        if(typeof callback !== 'function'){
            callback = function(){};
        }
        
        var id =  this.someId();
        
        this.proxydata[id] = {
            'clb': callback
        };
        
        responseData.loadTime = responseLoadTime;
        
        this.worker.postMessage({cmd: 'savehistoryresponse', id: id, 'historyId': historyId, 'responseData': responseData});
    }
};