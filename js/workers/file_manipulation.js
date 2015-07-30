URL = webkitURL || URL;

onmessage = function(e) {
    var cmd = e.data.cmd;
    switch (cmd) {
        case 'createfileurl':
            var body = e.data.body;
            var encoding = e.data.encoding;
            var blob = new Blob([body], {type: encoding});
            var url = URL.createObjectURL(blob);
            postMessage({url:url});
        break;
    }
};