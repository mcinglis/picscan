
var psnav = psnav || new function() {

  this.Navigation = Backbone.Model.extend({

    current: function() {
      return this.get('current');
    },

    screens: function() {
      return this.get('screens');
    },

    routes: function() {
      var routes = { '': this.screens()[0] };
      for (var i = 0; i < this.screens().length - 1; i++) {
        routes[this.screens()[i]] = this.screens()[i];
      }
      return routes;
    },

    defaults: function() {
      return { current: 0 };
    },

    goNext: function() {
      this.set({
        current: Math.min(this.current() + 1, this.screens().length - 1)
      });
    },

    goPrevious: function() {
      this.set({
        current: Math.max(this.current() - 1, 0)
      });
    },

    getPrevious: function() {
      var current = this.current();
      if (current <= 0) {
        return null;
      } else {
        return this.screens()[current - 1];
      }
    },

    getNext: function() {
      var current = this.current();
      if (current >= this.screens().length - 1) {
        return null;
      } else {
        return this.screens()[current + 1];
      }
    },
  });

  this.NavigationView = Backbone.View.extend({
    el: '#navigation',
    template: _.template($('#navigation-template').html()),

    events: {
      'click #nav-next': function() { this.model.goNext(); },
      'click #nav-previous': function() { this.model.goPrevious(); }
    },

    initialize: function() {
      this.model.bind('change', this.render, this);
    },

    render: function() {
      this.$el.html(this.template({
        previous: this.model.getPrevious(),
        next: this.model.getNext()
      }));
      return this;
    },
  });

};
