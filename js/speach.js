(function() {
    "use strict";
    
    var context = this;
    function defineCommands() {
        if (context.annyang) {
            // Let's define a command.
            var commands = {
                'start request': function() {
                    console.log('Voice command: start request');
                    jQuery('body').trigger('request.begin');
                },
                'clear': function() {
                    console.log('Voice command: clear');
                    jQuery('body').trigger('request.clear');
                },
                'save': function() {
                    console.log('Voice command: save');
                    jQuery('body').trigger('request.save');
                },
                'open': function() {
                    console.log('Voice command: open');
                    jQuery('body').trigger('request.open');
                },
                'open :requestName': function(requestName) {
                    console.log('Voice command: open + requestName: ', requestName);
                    jQuery('body').trigger('request.open');
                },
                'show :page': function(page) {
                    console.log('Voice command: show page - ' + page);
                }
            };
            context.annyang.debug();
            // Initialize annyang with our commands
            context.annyang.init(commands);
            context.annyang.setLanguage('en');
            // Start listening.
            context.annyang.start();
        }
    }
    
    function loadAnnyag(callback){
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.src = chrome.runtime.getURL('js/annyang.js');
        ga.onload = function() {
            callback.call(window);
        };
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    };
    
    this.restClientSpeach = function(){
        loadAnnyag(defineCommands);
    };
    
}).call(this);