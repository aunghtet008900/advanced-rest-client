/***********************************************************
 // * 
 // *    THIS FILE IS INCLUDED BY WEBWORKER.
 // *    DO NOT MAKE ANY REFERENCE TO document or window OBJECT
 // *    (at least not in the closure).
 // *
 // ********************************************************/
var APP_DRIVE_DATA = {
    CLIENT_ID: '10525470235.apps.googleusercontent.com',
    boundary: 'ARCFormBoundary49nr1hyovoq1tt9',
    delimiter: "\r\n--ARCFormBoundary49nr1hyovoq1tt9\r\n",
    close_delim: "\r\n--ARCFormBoundary49nr1hyovoq1tt9--",
    appMimeType: 'application/restclient+data',
    appFileExtension: 'arc',
}


function RequestObject(initialData) {
    this.url = initialData.url || null;
    this.method = initialData.method || null;
    this.headers = initialData.headers || null;
    this.payload = initialData.payload || null;
    this.files = initialData.files || [];
}
RequestObject.prototype = {
    constructor: RequestObject,
    /**
     * Compare to request objects.
     * @param {Object|RequestObject} other
     * @returns {Boolean} true if every value of the request object is equal.
     */
    compare: function(other) {
        // not the same if url is different
        if (other.url !== this.url) {
            return false;
        }
        if (other.method !== this.method) {
            return false;
        }

        if (this.payload === null && other.payload === "") {
            this.payload = '';
        }

        if (other.payload !== this.payload) {
            return false;
        }

        if (other.files.length !== this.files.length) {
            return false;
        } else {
            for (var i = 0, len = other.files.length; i < len; i++) {
                if (other.files.indexOf(this.files[i].key) === -1) {
                    return false;
                }
            }
        }

        if (this.headers.length !== other.headers.length) {
            return false;
        } else {
            var headers = this.headers;
            var checkHeaders = other.headers;
            for (var i = 0, len = headers.length; i < len; i++) {
                var headerData = headers[i];
                var key = headerData.key;
                var found = false;
                for (var j = 0, jLen = checkHeaders.length; j < jLen; j++) {
                    if (checkHeaders[j].key === key) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            }
        }
        return true;
    }
};

function createCustomeEvent(name, details) {
    if (typeof details === 'undefined')
        details = {};
    var opt = {
        detail: details,
        bubbles: true,
        cancelable: true
    };
    return new CustomEvent(name, opt);
}

function getShortMonth(month){
    if(month < 0 || month > 11) return 'unknown';
    var months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
    return months[month];
}

function guessFileExtension(contentType){
    var map = {};
    map['text/plain'] = 'txt';
    map["application/json"] = "json";
    map["text/html,xhtml+xml"] = "html";
    map["atom,xml"] = "xml";
    map["javascript,"] = "js";
    map["css"] = "css";
    map["application/java,text/x-java-source"] = "class";
    map["application/x-gzip"] = "gz";
    map["text/x-h"] = "h";
    map["image/jpeg,image/pjpeg"] = "jpg";
    map["audio/x-mpequrl"] = "m3u";
    map["image/png"] = "png";
    map["application/x-tar"] = "tar";
    map["image/tiff,image/x-tiff"] = "tiff";
    map["application/x-zip-compressed,application/zip,multipart/x-zip"] = "zip";
    map["application/pdf"] = "pdf";
    map["image/gif"] = "gif";
    map["image/svg+xml"] = "svg";
    map["image/vnd.microsoft.icon"] = "icon";
    map["text/csv"] = "csv";
    
    for(var key in map){
        if(!map.hasOwnProperty(key)) continue;
        if(contentType.indexOf(key) !== -1 || key.indexOf(contentType) !== -1){
            return map[key];
        }
    }
    
    return 'txt';
}

var HttpHeadersParser = {
    /**
     * Parse HTTP headers input from string to array of a key:value pairs objects.
     * @param {String} string Raw HTTP headers input
     * @returns {Array} The arrao of key:value objects
     */
    fromString: function(string) {
        if (string === null || string === "") {
            return [];
        }
        var result = [],
                headers = string.split(/[\r\n]/gim);
        for (var i in headers) {
            var line = headers[i].trim();
            if (line.isEmpty())
                continue;
            var _tmp = line.split(/[:|\r\n]/gim, 2);
            if (_tmp.length > 0) {
                var obj = {
                    key: _tmp[0]
                };
                if (_tmp.length > 1) {
                    obj.value = _tmp[1].trim();
                }
                result[result.length] = obj;
            }
        }
        return result;
    },
    /**
     * Parse headers array to Raw HTTP headers string.
     * @param {Array} array lisk of objects with "key" and "value" keys.
     * @returns {String}
     */
    toString: function(array) {
        var result = "";
        for (var i = 0, len = array.length; i < len; i++) {
            var header = array[i];
            if (!result.isEmpty()) {
                result += "\n";
            }
            var key = header.key,
                    value = header.value;
            if (key && value && !(key.isEmpty() && value.isEmpty())) {
                result += key + ": " + value;
            }
        }
        return result;
    },
    /**
     * 
     * @param {String} string The headers value.
     * @returns {String|null} Content type value or null if not found.
     */
    getContentType: function(string) {
        var headersList = HttpHeadersParser.fromString(string),
                headersLength = headersList === null ? 0 : headersList.length,
                foundContentType = null,
                i = 0;
        for (; i < headersLength; i++) {
            var header = headersList[i];
            if (!header.key)
                continue;
            if (header.key.toLowerCase().trim() === 'content-type') {
                if (!header.value)
                    return;
                foundContentType = header.value;
                break;
            }
        }
        return foundContentType;
    }
};