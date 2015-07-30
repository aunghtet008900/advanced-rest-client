var Drive = {
    driveInitialized: false,
    pickerInitialized: false,
    __arc_pickercallback: [],
    __arc_authcallback: [],
    __arc_loadApiCallback: [],
    /**
     * Load Google API.
     */
    loadApi: function(callback) {
        if (Drive.driveInitialized) {
            callback();
            return;
        }
        Drive.__arc_loadApiCallback.push(callback);

        var script = document.createElement("script");
        script.src = "https://apis.google.com/js/client.js?onload=handleDriveClientLoad";
        script.type = "text/javascript";
        script.async = true;
        document.getElementsByTagName("head")[0].appendChild(script);
    },
    /**
     * Google Drive integration. Initalize Google Drive library.
     * @returns {undefined}
     */
    handleClientLoad: function() {
        gapi.client.load('drive', 'v2', function() {
            Drive.driveInitialized = true;
            if (!Drive.__arc_loadApiCallback
                    || Drive.__arc_loadApiCallback.length == 0)
                return;
            while (Drive.__arc_loadApiCallback.length > 0) {
                var clb = Drive.__arc_loadApiCallback.shift();
                clb.call(window);
            }
        });
    },
    getAuth: function(callback) {
        if (!Drive.driveInitialized) {
            Drive.loadApi(Drive.getAuth.bind(this, callback));
            return;
        }
        var gauth = {
            'client_id': APP_DRIVE_DATA.CLIENT_ID,
            'immediate': true, 
            'scope': ['https://www.googleapis.com/auth/drive.install','https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly.metadata']
        }
        
        gapi.auth.authorize(gauth, function(result){
            callback(result);
        });
        
//        chrome.runtime.getBackgroundPage(function(backgroundPage) {
//            backgroundPage.Drive.authDrive(function(authResult) {
//                if (authResult && authResult.access_token) {
//                    gapi.auth.setToken({'access_token': authResult.access_token});
//                }
//                callback(authResult);
//            });
//        });
    },
    getDriveFileId: function(mime, onResult, onError) {
        var dialog = jQuery('#driveFilePickerDialog').modal({'show':false}),
            wrapper = document.querySelector('#file-picker-list'),
            result = null, 
            latestSearchValue = null, 
            INIT_NEXT_PAGE_PADDING = 25;
        wrapper.innerHTML == '';
        
        var windowHeightPagging = 320;
        function onWindowResize(e){
            var height = window.innerHeight;
            if(height > 150+windowHeightPagging){
                wrapper.style.height = (height-windowHeightPagging)+'px';
            }
        }
        window.addEventListener('resize', onWindowResize, false);
        onWindowResize(null);
        
        function onWrapperScroll(e){
            var bottomScroll = e.target.scrollTop+e.target.offsetHeight
            if(e.target.scrollHeight - bottomScroll <= INIT_NEXT_PAGE_PADDING){
                getResultList();
            }
        }
        wrapper.addEventListener('scroll', onWrapperScroll, false);
        
        
        function clickListElement(e){
            var id = e.target.dataset['id'];
            if(!id) return;
            
            var selected = wrapper.querySelector(".Folder_Pickup_ResultRowSelected");
            if(selected){
                selected.classList.remove("Folder_Pickup_ResultRowSelected");
            }
            
            var select = wrapper.querySelector('.Folder_Pickup_ResultRow[data-id="'+id+'"]');
            if(select){
                select.classList.add("Folder_Pickup_ResultRowSelected");
            }
            
            result = id;
        }
        wrapper.addEventListener('click', clickListElement, false);
        
        
        onResult = onResult || function(){};
        onError = onError || function(){};
        
        var pageToken = null, hasMore = true, requestProgress = false;
        function loadResults(response){
            document.querySelector('#driveFileListLoading').classList.add('hidden');
            if('error' in response){
                wrapper.innerHTML = '<p class="text-danger">'+response.error.message+' - that\'s all I know.</p>';
                hasMore = false;
                return;
            }
            
            requestProgress = false;
            if(!response){
                pageToken = null;
                hasMore = false;
                return;
            }
            pageToken = response.nextPageToken;
            if(!pageToken){
                hasMore = false;
            }
            displayResults(response.items);
        }
        
        function getResultList(){
            if(!hasMore || requestProgress) return;
            document.querySelector('#driveFileListLoading').classList.remove('hidden');
            requestProgress = true;
            try{
                Drive.listFiles(loadResults, mime, pageToken, latestSearchValue);
            } catch(e){
                console.error('Error list files from Google Drive',e)
            }
        }
        
        function displayResults(items){
            
            var size = items ? items.length : 0;
            if(size === 0){
                hasMore = false;
                return;
            }
            
            for(var i=0; i<size; i++){
                var item = items[i];
                var container = document.querySelector('#drive-file-item-template').content.cloneNode(true)
                var icon = container.querySelector('img.file-icon'),
                    name = container.querySelector('.Folder_Pickup_Name'),
                    time = container.querySelector('.Folder_Pickup_Time');
                var date = new Date(item.createdDate);
                var month = getShortMonth(date.getMonth());
                icon.src = item.iconLink;
                name.innerText = item.title;
                time.innerText = (date.getDay()+1) + ' ' + month;
                var ids = container.querySelectorAll('[data-id]');
                for(var j=0, len=ids.length; j<len; j++){
                    ids[j].dataset['id'] = item.id;
                }
                wrapper.appendChild(container);
            }
        }
        
        function onSearch(e){
            var value = document.querySelector('#driveSearchInput').value;
            resetSearch(value);
        }
        document.querySelector('#driveSearchInput').addEventListener('search',onSearch,false);
        document.querySelector('#driveSearchButton').addEventListener('click',onSearch,false);
        
        function onHide(){
            window.removeEventListener('resize', onWindowResize, false)
            wrapper.removeEventListener('scroll', onWrapperScroll, false);
            wrapper.removeEventListener('click', clickListElement, false);
            document.querySelector('#driveSearchInput').removeEventListener('search',onSearch,false);
            document.querySelector('#driveSearchButton').removeEventListener('click',onSearch,false);
            dialog.unbind();
        }
        
        function resetSearch(searchValue){
            if(latestSearchValue != null && latestSearchValue === searchValue){
                return;
            }
            latestSearchValue = searchValue;
            pageToken = null;
            hasMore = true;
            wrapper.innerHTML = '';
            getResultList();
        }
        
        
        dialog.on('hide.bs.modal', onHide);
        dialog.on('click', function(e){
            var action = e.target.dataset['action'];
            if(!action) return;
            if(action === 'dialog-pick-file'){
                dialog.modal('hide');
                onResult(result);
            }
        });
        
        dialog.modal('show');
        getResultList();
    },
    listFiles: function(callback, mimeType, pageToken, query) {
        var q = "mimeType='" + mimeType + "' and trashed = false";
        if (query) {
            q += " and title contains '" + query + "'";
        }
        var params = {
            'q': q,
            'maxResults': 25,
            'fields': 'items(createdDate,iconLink,id,title),nextLink,nextPageToken'
        };
        if (pageToken != null) {
            params.pageToken = pageToken
        }
        
        var url = "https://content.googleapis.com/drive/v2/files?";
        for(var _k in params){
            url += _k + "=" + encodeURIComponent(params[_k]);
            url += '&';
        }
        
        try{
            var accessToken = gapi.auth.getToken().access_token;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            xhr.onload = function() {
                var resp = null;
                try {
                    resp = JSON.parse(xhr.responseText);
                } catch(e){
                    console.error('Request execution error (list files)', e);
                }
                
                callback(resp);
            };
            xhr.onerror = function(e) {
                console.error('Request execution error (list files)', e);
                callback(null);
            };
            try{
                xhr.send();
            } catch(e){
                console.error('Request execution error (list files)', e);
            }
        } catch(e){
            console.error('Request execution error (list files)', e);
            callback(null);
        }
        
        
//        var request = window.gapi.client.request({
//            'path' : '/drive/v2/files',
//            'method' : 'GET',
//            'params' : params
//        });
//        try{
//            request.execute(callback);
//        } catch(e){
//            console.error('Request execution error', e);
//        }
    },
            
    insertFile: function(parentId, filename, content, callback){
        try {
            if (typeof content === "object") {
                content = JSON.stringify(content);
            }
            var metadata = {
                'title': filename + '.' + APP_DRIVE_DATA.appFileExtension,
                'mimeType': APP_DRIVE_DATA.appMimeType,
                "parents": [{
                        "id": parentId
                    }]
            };
            var base64Data = btoa(content);
            var multipartRequestBody = APP_DRIVE_DATA.delimiter
                    + 'Content-Type: application/json\r\n\r\n'
                    + JSON.stringify(metadata) + APP_DRIVE_DATA.delimiter + 'Content-Type: '
                    + APP_DRIVE_DATA.appMimeType + '\r\n'
                    + 'Content-Transfer-Encoding: base64\r\n' + '\r\n' + base64Data
                    + APP_DRIVE_DATA.close_delim;
            var request = gapi.client.request({
                'path': '/upload/drive/v2/files',
                'method': 'POST',
                'params': {
                    'uploadType': 'multipart'
                },
                'headers': {
                    'Content-Type': 'multipart/mixed; boundary="' + APP_DRIVE_DATA.boundary + '"'
                },
                'body': multipartRequestBody
            });
            request.execute(callback);
        } catch (e) {
            callback({'error': e});
        }
    },
    updateFile: function(fileId, content, callback){
        try {
                if (typeof content == "object") {
                content = JSON.stringify(content);
            }
            var metadata = {
                'mimeType': APP_DRIVE_DATA.appMimeType
            };
            var base64Data = btoa(content);
            var multipartRequestBody = ""
                    + APP_DRIVE_DATA.delimiter
                    + 'Content-Type: application/json\r\n\r\n'
                    + JSON.stringify(metadata)
                    + APP_DRIVE_DATA.delimiter
                    + 'Content-Type: ' + APP_DRIVE_DATA.appMimeType + '\r\n'
                    + 'Content-Transfer-Encoding: base64\r\n\r\n'
                    + base64Data
                    + APP_DRIVE_DATA.close_delim;
            var request = gapi.client.request({
                'path': '/upload/drive/v2/files/' + fileId,
                'method': 'PUT',
                'params': {
                    'uploadType': 'multipart'
                },
                'headers': {
                    'Content-Type': 'multipart/mixed; boundary="' + APP_DRIVE_DATA.boundary + '"'
                },
                'body': multipartRequestBody
            });
            request.execute(callback);
        } catch (e) {
            callback({'error': e});
        }
    },
    getFile: function(downloadUrl, callback){
        try{
            var accessToken = gapi.auth.getToken().access_token;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', downloadUrl);
            xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            xhr.onload = function() {
                callback(xhr.responseText);
            };
            xhr.onerror = function(e) {
                log(e);
                callback(null);
            };
            xhr.send();
        } catch(e){
            log(e);
            callback(null);
        }
    },
    getFileMeta: function(fileId, callback){
        try{
            var request = gapi.client.request({
                'path' : '/drive/v2/files/'+fileId,
                'method' : 'GET',
                'params' : {
                    'fields' : 'downloadUrl,title,etag'
                }
            });
            request.execute(function(resp) {
                callback(resp);
            });
        }catch(e){
            log(e);
            callback(null);
        }
    }
}
function handleDriveClientLoad() {
    Drive.handleClientLoad();
}