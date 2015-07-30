function AppRouter() {
    if (typeof Router === 'undefined') {
        throw "Router is not loaded";
    }
    this.router = new Router();
}
AppRouter.prototype = {
    constructor: AppRouter,
    initialize: function() {
        this.appRoutes();
        this.router.start();
    },
    navigate: function(page){
        this.router.checkRoutes({data: {url: page}});
    },
    appRoutes: function(){
        
        var firePageChangeEvent = function(page, details){
            details = details || null;
            var event = createCustomeEvent('pagechangeevent', {
                'page': page,
                'details': details
            });
            document.querySelector('body').dispatchEvent(event);
        };
        
        
        this.router.route('/index.html', function() {
            firePageChangeEvent('request');
        });
        this.router.route('/index.html\\?request', function() {
            firePageChangeEvent('request');
        });
        this.router.route('/index.html\\?request/:source/:id', function(source, id) {
            firePageChangeEvent('request', {action: source, id: id});
        });
        this.router.route('/index.html\\?history', function() {
            firePageChangeEvent('history');
        });
        this.router.route('/index.html\\?history/:action/:id', function(action, id) {
            firePageChangeEvent('history', {action: action, id: id});
        });
        this.router.route('/index.html\\?settings', function() {
            firePageChangeEvent('settings');
        });
        this.router.route('/index.html\\?about', function() {
            firePageChangeEvent('about');
        });
        this.router.route('/index.html\\?socket', function() {
            firePageChangeEvent('socket');
        });
        this.router.route('/index.html\\?saved', function() {
            firePageChangeEvent('saved');
        });
    }
};