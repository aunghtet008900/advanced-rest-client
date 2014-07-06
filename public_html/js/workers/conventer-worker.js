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


self.onmessage = function(e) {
    var data = e.data;

    switch (data.type) {
        case 'curl':
            getAsCurl(data.http);
            break;
        case 'har':
            getAsHar(data.http, data.har);
            break;
    }
};

function getAsCurl(requestData) {
    var headers_to_commands = ['user-agent', 'accept-encoding'];
    var cmd = "curl '";
    //url
    cmd += requestData.url + "' ";
    //add headers
    var pending_commands = [];

    for (var key in requestData.headers) {
        var _header_value = requestData.headers[key];
        var header = {
            'name': key,
            'value': _header_value
        };
        if (headers_to_commands.indexOf(header.name.toLowerCase()) !== -1) {
            var parsed = parseHeaderToCommand(header);
            pending_commands[pending_commands.length] = parsed[0];
            header = parsed[1];
            if (header === null)
                continue;
            cmd += "-H '";
            cmd += header;
            cmd += "' ";
        } else {
            cmd += "-H '";
            cmd += header.name + ': ' + header.value;
            cmd += "' ";
        }
    }

    //add commands
    for (var i = 0, len = pending_commands.length; i < len; i++) {
        var command = pending_commands[i];
        cmd += command + " ";
    }
    var noPayloadMethods = ['get', 'options', 'delete'];
    //post data?
    if (noPayloadMethods.indexOf(requestData.method) === -1) {
        cmd += "--data '";
        cmd += requestData.payload || '';
        cmd += "'";
    }


    self.postMessage(cmd);
}

/**
 * Some of the headers have representation in command switchers. 
 * For example 'User-Agent' headers is --user-agent "agent string" option.
 * THer's no need to set 'User-Agent' header at the time.
 * However, accept-encoding header may trigger use of --compressed option
 * and the header still should be sent. 
 * 
 * @param {Object} header Header object with 'name' and 'value' keys.
 * @returns {Array} First item is a command to append. Second item is a header value. If header should not be set it will be set to null.
 */
function parseHeaderToCommand(header) {
    var command = null, _header = null;
    switch (header.name) {
        case 'accept-encoding':
            command = '--compressed';
            _header = header.name + ': ' + header.value;
            break;
        case 'user-agent':
            command = '--user-agent "' + header.value + '"';
            _header = null;
            break;
    }

    return [command, _header];
}


function getAsHar(httpData, har) {
    var page;
    if (!("log" in har)) {
        har = getHarRoot();
        har.log.creator = getHarCreator();
        har.log.browser = getHarBrowser();
        page = getHarPage(httpData.request, 0);
    } else {
        page = getHarPage(httpData.request, har.log.pages.length);
    }
    har.log.pages[har.log.pages.length] = page;
    //TODO: add redirects.
    if(httpData.response){
        har.log.entries[har.log.entries.length] = getHarEntry(page.id, httpData);
    }
    self.postMessage(har);
}


function getHarRoot() {
    return {
        "log": {
            "version": "1.2",
            "creator": {},
            "browser": {},
            "pages": [],
            "entries": [],
            "comment": ""
        }
    };
}

function getHarCreator() {
    return {
        'name': 'Advanced Rest Client',
        'version': 4.0, //TODO: pass app version to the worker.
        'comment': 'REST testing tool for Google Chrome.'
    };
}

function getHarBrowser() {
    return {
        'name': 'Chrome',
        'version': 'unknown' //TODO: pass chrome version to the worker.
    };
}
function getHarPage(request, no) {
    return {
        'startedDateTime': new Date().toJSON(),
        'id': 'page_' + no,
        'title': request.name || request.url,
        'pageTimings': {
            "onContentLoad": 0,
            "onLoad": 0,
            "comment": ""
        },
        "comment": request.name ? "local":"history"
    };
}

function getHarEntry(pageId, httpData) {

    return {
        "pageref": pageId,
        "startedDateTime": new Date(httpData.connection.metrics.start).toJSON(),
        "time": httpData.response.responseTime,
        "request": getHarEntryRequest(httpData.request),
        "response": getHarEntryResponse(httpData.response),
        "cache": { //this app doesn't use cache.
            "comment": ""
        },
        "timings": {
            "blocked": 0,
            "dns": -1,
            "connect": -1,
            "send": 0,
            "wait": 0,
            "receive": httpData.response.responseTime,
            "ssl": -1,
            "comment": ""
        },
        "comment": ""
    };
}

function getHarEntryRequest(request) {
    var harHeaders = getHarHeaders(request.headers);
    var headersSize = countHeadersSize(harHeaders);

    var postData = getHarRequestPayload(harHeaders, request.payload, request.method);

    var result = {
        "method": request.method,
        "url": request.url,
        "httpVersion": "HTTP/1.1",
        "cookies": getHarRequestCookies(harHeaders),
        "headers": harHeaders,
        "queryString": getHarQueryString(request.url),
        "postData": {},
        "headersSize": headersSize,
        "bodySize": 0,
        "comment": ""
    };

    if (postData) {
        result.postData = postData;
        result.bodySize = getHarPayloadSize(request.payload);
    }

    return result;
}

function getHarEntryResponse(response) {
    var harHeaders = getHarHeaders(response.headers);
    var headersSize = countHeadersSize(harHeaders);
    var cookies = getHarResponseCookies(harHeaders);
    var payload = response.response;

    var contentType = null;
    for (var i = 0, len = harHeaders.length; i < len; i++) {
        if (harHeaders[i].name.toLowerCase() === 'content-type') {
            contentType = harHeaders[i].value;
            break;
        }
    }

    var result = {
        "status": response.status,
        "statusText": response.statusText,
        "httpVersion": "HTTP/1.1",
        "cookies": cookies,
        "headers": harHeaders,
        "content": {
            "size": 0,
            "mimeType": contentType,
            "comment": ""
        },
        "redirectURL": "",
        "headersSize": headersSize,
        "bodySize": 850,
        "comment": ""
    };

    if (payload) {
        result.content.size = payload.length;
        try{
            result.content.text = btoa(payload);
        }catch(e){
            result.content.text = payload;
        }
    }

    return result;
}



function getHarRequestCookies(headers) {
    var cookieStr = [];
    for (var i = 0, len = headers.length; i < len; i++) {
        if (headers[i].name.toLowerCase() === "cookie") {
            cookieStr[cookieStr.length] = headers[i].value;
        }
    }
    if (cookieStr.length === 0) {
        return [];
    }

    var cookies = [];
    for (var i = 0, len = cookieStr.length; i < len; i++) {
        var str = cookieStr[i];
        var _tmp = str.split(';');

        for (var j = 0, lenTmp = _tmp.length; j < lenTmp; j++) {
            var pairs = _tmp[i].trim().split('=');
            var _cookie = {
                "name": pairs[0],
                "value": pairs[1],
                "path": "",
                "domain": "",
                "expires": "",
                "httpOnly": false,
                "secure": false,
                "comment": ""
            };
            cookies[cookies.length] = _cookie;
        }
    }
    return cookies;
}

function getHarResponseCookies(headers) {

    headers = getHarHeaders(headers);
    var cookieStr = [];
    for (var i = 0, len = headers.length; i < len; i++) {
        if (headers[i].name.toLowerCase() === "set-cookie") {
            cookieStr[cookieStr.length] = headers[i].value;
        }
    }

    if (cookieStr.length === 0) {
        return [];
    }

    var cookies = [];
    for (var i = 0, len = cookieStr.length; i < len; i++) {
        var str = cookieStr[i];
        var _tmp = str.split(';');
        var _cookie = {
            "name": "",
            "value": "",
            "path": "",
            "domain": "",
            "expires": "",
            "httpOnly": false,
            "secure": false,
            "comment": ""
        };
        for (var j = 0, lenTmp = _tmp.length; j < lenTmp; j++) {
            var pairs = _tmp[i].trim().split('=');
            if (j === 0) {
                _cookie.name = pairs[0];
                _cookie.value = pairs[1];
            } else {
                switch (pairs[0].trim().toLowerCase()) {
                    case 'httponly':
                        _cookie['httpOnly'] = true;
                        break;
                    case 'secure':
                        _cookie['secure'] = true;
                        break;
                    default:
                        _cookie[pairs[0]] = pairs[1];
                }
            }
        }
        cookies[cookies.length] = _cookie;
    }

    return cookies;
}

function getHarHeaders(headers) {
    if (headers instanceof Array) {
        return getHarArrayHeaders(headers);
    }
    return getHarObjectHeaders(headers);
}

function getHarArrayHeaders(headers) {
    var result = [];

    for (var i = 0, len = headers.length; i < len; i++) {
        result[result.length] = {
            "name": headers[i].name,
            "value": headers[i].value,
            "comment": ""
        };
    }

    return result;
}
function getHarObjectHeaders(headers) {
    var result = [];

    for (var name in headers) {
        if (headers.hasOwnProperty(name)) {
            result[result.length] = {
                "name": name,
                "value": headers[name],
                "comment": ""
            };
        }
    }

    return result;
}

function getHarQueryString(url) {
    if (!!!url)
        return [];
    if (url.indexOf('?') === -1)
        return [];

    var query = url.substr(url.indexOf('?') + 1);
    //remove hash
    if (query.indexOf('#') !== -1) {
        query = query.substr(0, query.indexOf('#'));
    }
    if (query.trim() === "")
        return [];
    var queryParts = query.split('&');
    var result = [];
    for (var i = 0, len = queryParts.length; i < len; i++) {
        var params = queryParts[i].split('=');
        result[result.length] = {
            "name": params[0],
            "value": params[1] || "",
            "comment": ""
        };
    }
    return result;
}

function countHeadersSize(harHeaders) {
    var size = 0;
    for (var i = 0, len = harHeaders.length; i < len; i++) {
        size += harHeaders[i].name.length;
        size += harHeaders[i].value.length;
    }
    return size;
}

function getHarRequestPayload(harHeaders, httpPayload, httpMethod) {
    if (!!httpMethod) {
        if (['GET', 'OPTIONS', 'DELETE'].indexOf(httpMethod) !== -1) {
            return null;
        }
    }
    if (!!!httpPayload) {
        return null;
    }

    var contentType = null;
    for (var i = 0, len = harHeaders.length; i < len; i++) {
        if (harHeaders[i].name.toLowerCase() === 'content-type') {
            var _tmp = harHeaders[i].value.split(';');
            contentType = _tmp[0];
        }
    }

    var result = {
        "mimeType": contentType,
        "params": [],
        "text": httpPayload,
        "comment": ""
    };
    return result;
}

function getHarPayloadSize(httpPayload) {
    return httpPayload.length; //TODO: it is only valid for strings.
}