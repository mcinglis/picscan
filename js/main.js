
window.URL = window.URL || window.webkitURL;

required_apis = [
  window.File, window.FileReader, window.FileList, window.Blob, window.URL 
];

if (!(_.every(required_apis, _.identity))) {
  alert('The required APIs are not supported by your browser.');
}

var MAX_CANVAS_HEIGHT = 400, MAX_CANVAS_WIDTH = 1100;

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

  var ScreenView = Backbone.View.extend({
    el: '#dynamic',
  });

  var StartView = ScreenView.extend({
    template: template('#start-template'),

    render: function() {
      this.$el.html(this.template());
      this.saveRatio();
      return this;
    },

    events: {
      'change #file': 'saveImageURL',
      'change #ratio': 'saveRatio',
    },

    saveImageURL: function() {
      var element = $('#file')[0],
          url = URL.createObjectURL(element.files[0]);
      configuration.set('imageURL', url);
    },

    saveRatio: function() {
      var element = $('#ratio :selected'),
          value = parseFloat(element.attr('value'));
      configuration.set('sizeRatio', value);
    },
  });

  var OverviewView = ScreenView.extend({
    template: template('#overview-template'),

    render: function() {
      this.$el.html(this.template());
      this.renderCanvas();
      return this;
    },

    renderCanvas: function() {
      this.canvas = new fabric.Canvas('overview', { selection: false });
      var canvas = this.canvas;

      fabric.Image.fromURL(configuration.imageURL, function(image) {
        var heightRatio = MAX_CANVAS_HEIGHT / image.height,
            widthRatio = MAX_CANVAS_WIDTH / image.width;
        configuration.set('overviewHeightRatio', heightRatio);
        configuration.set('overviewWidthRatio', widthRatio);
        if (heightRatio < widthRatio) {
          image.scale(heightRatio);
          canvas.setWidth(image.width * heightRatio);
        } else {
          image.scale(widthRatio);
          canvas.setHeight(image.height * widthRatio);
        }
        canvas.add(image);
        image.center();
        image.selectable = false;
        canvas.renderAll();
      });

      this.renderCanvasCursors();
    },

    renderCanvasCursors: function() {
      var tl = configuration.overviewTL,
          tr = configuration.overviewTR,
          br = configuration.overviewBR,
          bl = configuration.overviewBL,
          line1 = this.makeEdge([ tl.x, tl.y, tr.x, tr.y]),
          line2 = this.makeEdge([ tr.x, tr.y, br.x, br.y]),
          line3 = this.makeEdge([ br.x, br.y, bl.x, bl.y]),
          line4 = this.makeEdge([ bl.x, bl.y, tl.x, tl.y]);

      this.canvas.add(line, line2, line3, line4);

      this.canvas.add(
        this.makeCorner(line1.get('x1'), line1.get('y1'), line1, line2),
        this.makeCorner(line2.get('x2'), line2.get('y2'), line2, line3),
        this.makeCorner(line3.get('x2'), line3.get('y2'), line3, line4),
        this.makeCorner(line4.get('x2'), line4.get('y2'), line4, line1)
      );

      this.canvas.on('object:moving', function(e) {
        var p = e.target;
        p.line1 && p.line1.set({ 'x2': p.left, 'y2': p.top });
        p.line2 && p.line2.set({ 'x1': p.left, 'y1': p.top });
        this.canvas.renderAll();
      });
    },
	
	makeCorner: function (centerX, centerY, lineCounter, lineClock) {
      var c = new Cross({ top: centerY, left: centerX, fill: 'red' });
      c.hasControls = c.hasBorders = false;
      c.line1 = lineCounter;
      c.line2 = lineClock;
      return c;
	},

	makeEdge: function (coords) {
      return new fabric.Line(coords, {
        fill: 'yellow',
        strokeWidth: 1,
        selectable: false
      });
	},
  });

  var RectifyView = ScreenView.extend({
    template: template('#corners-template'),
    render: function() {
      this.$el.html(this.template());
      return this;
    },
  });

  var Router = Backbone.Router.extend({
    views: {
      start: new StartView(),
      overview: new OverviewView(),
      corners: new RectifyView(),
    },

    initialize: function(options) {
      (new psnav.NavigationView({ model: options.navigation })).render();
      this.route(/^(.*)$/, 'view', this.renderView);
    },

    renderView: function(name) {
      name = name || 'start';
      return this.views[name].render();
    },
  });

  var navigation = new psnav.Navigation({
    screens: ['start', 'overview', 'corners']
  });
  router = new Router({ navigation: navigation });
  Backbone.history.start();
  Backbone.history.navigate('');
});
