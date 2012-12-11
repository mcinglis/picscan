$(function() {

  function template(identifier) {
    return _.template($(identifier).html());
  }

  var Navigation = Backbone.Model.extend({
    defaults: function() {
      return {
        previous: false,
        current: 'start',
        next: 'overview'
      };
    },

    cycle: function(newNext) {
      this.set({
        previous: this.get('current'),
        current: this.get('next'),
        next: newNext,
      });
    }
  });

  var NavigationView = Backbone.View.extend({
    el: '#navigation',
    template: template('#navigation-template'),

    events: {
      'click #nav-next': 'nextScreen',
      'click #nav-previous': 'previousScreen'
    },

    initialize: function() {
      this.model.bind('change', this.render, this);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    setNextScreen: function(screen) {
      this.model.cycle(screen);
    },

    nextScreen: function() {

    },

    previousScreen: function() {},
  });

  var ScreenView = Backbone.View.extend({
    el: '#dynamic',
  });

  var StartView = ScreenView.extend({
    template: template('#start-template'),
    render: function() {
      this.$el.html(this.template());
      return this;
    },
  });

  var OverviewView = ScreenView.extend({
    template: template('#overview-template'),
    render: function() {
      this.$el.html(this.template());
      return this;
    }
  });

  var Router = Backbone.Router.extend({
    views: {
      navigation: new NavigationView({ model: new Navigation() }),
      start: new StartView(),
      overview: new OverviewView()
    },

    initialize: function(options) {
      this.views.navigation.render();
    },

    routes: {
      '': 'start',
      'start': 'start',
      'overview': 'overview'
    },

    start: function() {
      return this.views.start.render();
    },

    overview: function() {
      this.views.navigation.setNextScreen('blerh');
      return this.views.overview.render();
    }
  });

  router = new Router();
  router.on('all', function(name) { console.log(name); });

  Backbone.history.start();
});
