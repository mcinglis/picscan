
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
		
		var p1 = configuration.
		
		var line1 = this.makeEdge([ tl.x, tl.y, tr.x, tr.y]),
		var line2 = this.makeEdge([ tr.x, tr.y, br.x, br.y]),
		var line3 = this.makeEdge([ br.x, br.y, bl.x, bl.y]),
		var line4 = this.makeEdge([ bl.x, bl.y, tl.x, tl.y]);

		this.canvas.add(line, line2, line3, line4);

		this.canvas.add(
			this.makeCorner(line1.get('x1'), line1.get('y1'), line1, line2),
			this.makeCorner(line2.get('x2'), line2.get('y2'), line2, line3),
			this.makeCorner(line3.get('x2'), line3.get('y2'), line3, line4),
			this.makeCorner(line4.get('x2'), line4.get('y2'), line4, line1),
		);
		
		this.canvas.on('object:moving', function(e) {
			var p = e.target;
			p.line1 && p.line1.set({ 'x2': p.left, 'y2': p.top });
			p.line2 && p.line2.set({ 'x1': p.left, 'y1': p.top });
			this.canvas.renderAll();
		});
      return this;
    },
	
	
	makeCorner: function (centerX, centerY, lineCounter, lineClock) {
		var c = new Cross({
			top: centerY,
			left: centerX,
			fill: 'red',
		});
		
		c.hasControls = c.hasBorders = false;

		c.line1 = line1;
		c.line2 = line2;

		return c;
	},

	makeEdge: function (coords) {
		return new fabric.Line(coords, {
			fill: 'yellow',
			strokeWidth: 1,
			selectable: false
		});
	},

	saveCorner: function() {
		configuration.set(key, value);
	},
	
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
