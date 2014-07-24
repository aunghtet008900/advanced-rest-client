var proto = Object.create(HTMLButtonElement.prototype);
proto.createdCallback = function() {
    var t = document.querySelector('link[rel="import"][href*="history-entry.html"]').import.querySelector('#sdtemplate');
    var clone = document.importNode(t.content, true);
    this.createShadowRoot().appendChild(clone);
};
document.registerElement('history-entry', {prototype: proto});
