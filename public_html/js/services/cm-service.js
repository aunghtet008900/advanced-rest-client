/**
 * @ngdoc overview
 * @name arc.cmService
 *
 * @description
 * A Code Mirror service for ARC.
 * This service contain methods used by the app to support CM editor.
 */
angular.module('arc.cmService', [])
  /**
   * @ngdoc Factory
   * @name CodeMirror
   * @function
   * 
   * @description
   * 
   * This service is responsible fort handling Code Mirror Editor in the app.
   * It is holding reference to CM instance and will react on App values change
   * like content type header to update editor.
   * 
   * @param {RequestValues} RequestValues 
   * The request values. 
   * 
   * @TODO
   * Remove request values and use different way to get current content type 
   * (like Abgular's values).
   */
  .factory('CodeMirror', ['RequestValues',function(RequestValues) {
    
    var headersCodeMirrorInstance = null, payloadCodeMirrorInstance = null;;
    var headerOptions = {
        lineWrapping: true,
        lineNumbers: false,
        autoClearEmptyLines: true,
        mode: 'message/http',
        extraKeys: {
            'Ctrl-Space': function (cm){
                 try {
                     CodeMirror.showHint(cm, CodeMirror.headersHint);
                 } catch (e) {
                     console.warn('Headers hint error', e);
                 }
            }
        },
        onLoad: function(_editor) {
            headersCodeMirrorInstance = _editor;
        }
    };
        
    var payloadEditorOptions = {
        lineWrapping: true,
        lineNumbers: false,
        autoClearEmptyLines: false,
        onLoad: function(_editor) {
            payloadCodeMirrorInstance = _editor;
            setPayloadEditorCurrentMode();
        },
        extraKeys: {
            'Ctrl-Space': function(cm) {
                var module = null, ct = RequestValues.getCurrentContentType();
                if (!ct || ct.indexOf("html") >= 0) {
                    module = CodeMirror.hint.html;
                } else if (ct.indexOf("json") >= 0 || ct.indexOf("javascript") >= 0) {
                    module = CodeMirror.hint.javascript;
                } else if (ct.indexOf("xml") >= 0 || ct.indexOf("atom") >= 0 || ct.indexOf("rss") >= 0) {
                    module = CodeMirror.hint.xml;
                } else if (ct.indexOf("sql") >= 0) {
                    module = CodeMirror.hint.sql;
                } else if (ct.indexOf("css") >= 0) {
                    module = CodeMirror.hint.css;
                } else {
                    module = CodeMirror.hint.anyword;
                }
                CodeMirror.showHint(cm, module, {});
            }
        }
    };
        
    var setPayloadEditorCurrentMode = function() {
        if (!payloadCodeMirrorInstance)
            return;
        //translate mode
        var mode = "", ct = RequestValues.getCurrentContentType();
        if (!ct || ct.indexOf("html") >= 0) {
            mode = 'htmlmixed';
        } else if (ct.indexOf("json") >= 0 || ct.indexOf("javascript") >= 0) {
            mode = 'javascript';
        } else if (ct.indexOf("xml") >= 0 || ct.indexOf("atom") >= 0 || ct.indexOf("rss") >= 0) {
            mode = 'xml';
        } else if (ct.indexOf("sql") >= 0) {
            mode = 'sql';
        } else if (ct.indexOf("css") >= 0) {
            mode = 'css';
        } else {
            mode = 'htmlmixed';
        }
        payloadCodeMirrorInstance.setOption("mode", ct);
        CodeMirror.autoLoadMode(payloadCodeMirrorInstance, mode);
    };
        
    var service = {
        'headersOptions': headerOptions,
        'payloadOptions': payloadEditorOptions,
        get headersInst () {
            return headersCodeMirrorInstance;
        },
        get payloadInst () {
            return payloadCodeMirrorInstance;
        },
        'updateMode': setPayloadEditorCurrentMode,
        'highlight': function(txt, mode, dest, ready){
            CodeMirror.runMode(txt, mode, dest, ready);
        }
    };
    
    return service;
}]);