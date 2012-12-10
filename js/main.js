$(function(){
  var Router = Backbone.Router.extend({
    routes: {
      '': 'file',
      'file': 'file',
      'overview': 'overview'
    },

    file: function() {
      return (new FileView()).render();
    },

    overview: function() {
      return (new OverviewView()).render();
    }
  });

  var FileView = Backbone.View.extend({
    el: '#container',
    template: _.template($('#file-template').html()),
    render: function() {
      this.$el.html(this.template());
      return this;
    },
  });

  var OverviewView = Backbone.View.extend({
    el: '#container',
    template: _.template($('#overview-template').html()),
    render: function() {
      this.$el.html(this.template());
      return this;
    }
  });

  new Router();
  Backbone.history.start();
})
