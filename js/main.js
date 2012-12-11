
if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  alert('The file APIs are not supported by your browser.');
}

$(function() {

  function template(identifier) {
    return _.template($(identifier).html());
  }

  var configuration = {
    set: function(key, value) {
      this[key] = value;
      console.log('configuration.' + key + ' = ' + value);
    },
  };

  var ScreenView = Backbone.View.extend({ el: '#dynamic', });

  var StartView = ScreenView.extend({
    template: template('#start-template'),

    render: function() {
      this.$el.html(this.template());
      this.saveSize();
      return this;
    },

    events: {
      'change #size': 'saveSize',
    },
      
    saveSize: function() {
        var value = parseFloat($('#size :selected').attr('value'));
        configuration.set('sizeRatio', value);
    },
  });

  var OverviewView = ScreenView.extend({
    template: template('#overview-template'),
    render: function() {
      this.$el.html(this.template());
      this.canvas = new fabric.StaticCanvas('overview');
      return this;
    }
  });

  var CornersView = ScreenView.extend({
    template: template('#corners-template'),
    render: function() {
      this.$el.html(this.template());
      return this;
    },
  });

  var Router = Backbone.Router.extend({
    views: {
      start: StartView,
      overview: OverviewView,
      corners: CornersView,
    },

    initialize: function(options) {
      (new psnav.NavigationView({ model: options.navigation })).render();
      this.route(/^(.*)$/, 'view', this.renderView);
    },

    renderView: function(name) {
      viewClass = name === '' ? StartView : this.views[name];
      return (new viewClass()).render();
    },
  });

  var navigation = new psnav.Navigation({
    screens: ['start', 'overview', 'corners']
  });
  router = new Router({ navigation: navigation });
  Backbone.history.start();
});
