
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

      var view = this;
      fabric.Image.fromURL(configuration.imageURL, function(image) {
        var heightRatio = MAX_CANVAS_HEIGHT / image.height,
            widthRatio = MAX_CANVAS_WIDTH / image.width,
            scale = Math.min(heightRatio, widthRatio);

        image.scale(scale);
        view.canvas.setHeight(image.height * scale);
        view.canvas.setWidth(image.width * scale);
        configuration.set('overviewScale', scale);

        view.canvas.add(image);
        image.center();
        image.selectable = false;
        image.sendToBack();
        view.renderCanvasCursors();
        view.canvas.renderAll();
      });

    },

    getCursorPoints: function() {
      var osx = this.canvas.width / 4;
	  var osy = this.canvas.height / 4;
      return {
        tl: { x: osx, y: osy },
        tr: { x: this.canvas.width - osx, y: osy },
        bl: { x: osx, y: this.canvas.height - osy },
        br: { x: this.canvas.width - osx, y: this.canvas.height - osy },
      };
    },

    renderCanvasCursors: function() {
      var view = this;
      var c = this.getCursorPoints(),
          line1 = this.makeEdge([ c.tl.x, c.tl.y, c.tr.x, c.tr.y]),
          line2 = this.makeEdge([ c.tr.x, c.tr.y, c.br.x, c.br.y]),
          line3 = this.makeEdge([ c.br.x, c.br.y, c.bl.x, c.bl.y]),
          line4 = this.makeEdge([ c.bl.x, c.bl.y, c.tl.x, c.tl.y]);

      this.canvas.add(line1, line2, line3, line4);

      this.corners = {
        tl: this.makeCorner(line4.get('x2'), line4.get('y2'), line4, line1),
        tr: this.makeCorner(line1.get('x2'), line1.get('y2'), line1, line2),
        bl: this.makeCorner(line3.get('x2'), line3.get('y2'), line3, line4),
        br: this.makeCorner(line2.get('x2'), line2.get('y2'), line2, line3),
      };

      this.canvas.add(
          this.corners.tl,
          this.corners.tr,
          this.corners.bl,
          this.corners.br
      );

      function saveCornerPositions(corners) {
        function getPos(corner) {
          return { x: corner.left, y: corner.top }
        }
        configuration.set('overviewTL', getPos(corners.tl));
        configuration.set('overviewTR', getPos(corners.tr));
        configuration.set('overviewBL', getPos(corners.bl));
        configuration.set('overviewBR', getPos(corners.br));
      }

      var canvas = this.canvas;
      this.canvas.on('object:moving', function(e) {
        var p = e.target;
        p.line1 && p.line1.set({ 'x2': p.left, 'y2': p.top });
        p.line2 && p.line2.set({ 'x1': p.left, 'y1': p.top });
        saveCornerPositions(view.corners);
        canvas.renderAll();
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

/* **************** CORNERS VIEW ****************** */
var CornersView = ScreenView.extend({
    template: template('#corners-template'),
    render: function() {
      this.$el.html(this.template());
      this.renderCanvases();
      return this;
    },
	
	makeCanvas: function(identifier, selectedPoint) {
		function scaleOverviewPoint(point) {
			var scale = configuration.overviewScale;
			return { x: point.x / scale, y: point.y / scale };
		}
		function toPoint(xValue, yValue) {
			return { x: xValue, y: yValue };
		}
		var view = {};
		view.canvas = new fabric.Canvas(identifier, { selection: false });
		view.corner = scaleOverviewPoint(selectedPoint);
		view.offset = toPoint(view.corner.x - (view.canvas.width/2), view.corner.y - (view.canvas.height/2));
		
		fabric.Image.fromURL(configuration.imageURL, function(image) {
			view.offset.y = image.height/2 - view.offset.y;
			view.offset.x = image.width/2 - view.offset.x;
			image.top = view.offset.y;
			image.left = view.offset.x;
			
			view.canvas.add(image);
			image.selectable = false;
			image.sendToBack();
		});
		return view;
	},
	
	setupCanvases: function(){
		this.TL = this.makeCanvas('topleft', configuration.overviewTL);
		this.TR = this.makeCanvas('topright', configuration.overviewTR);
		this.BL = this.makeCanvas('bottomleft', configuration.overviewBL);
		this.BR = this.makeCanvas('bottomright', configuration.overviewBR);
	},

	
	renderCanvases: function() {
      this.setupCanvases();
	  
	  var lines = {
		line1: this.makeEdge([ c.tl.x, c.tl.y, c.tr.x, c.tr.y]),
        line2: this.makeEdge([ c.tr.x, c.tr.y, c.br.x, c.br.y]),
        line3: this.makeEdge([ c.br.x, c.br.y, c.bl.x, c.bl.y]),
        line4: this.makeEdge([ c.bl.x, c.bl.y, c.tl.x, c.tl.y]),
	  };

      this.corners = {
        tl: this.makeCorner(line4.get('x2'), line4.get('y2'), line4, line1),
        tr: this.makeCorner(line1.get('x2'), line1.get('y2'), line1, line2),
        bl: this.makeCorner(line3.get('x2'), line3.get('y2'), line3, line4),
        br: this.makeCorner(line2.get('x2'), line2.get('y2'), line2, line3),
      };

    },

	
  });
  
 /* **************** RECTIFY VIEW ****************** */

 var RectifyView = ScreenView.extend({
    template: template('#rectify-template'),
    render: function() {
      this.$el.html(this.template());
      this.rectify();
      return this;
    },

    rectify: function() {
      function distance(p1, p2) {
        var dx = Math.abs(p1.x - p2.x),
            dy = Math.abs(p1.y - p2.y);
        return Math.sqrt((dx * dx) + (dy * dy));
      }
      function scaleOverviewPoint(point) {
        var scale = configuration.overviewScale;
        return { x: point.x / scale, y: point.y / scale };
      }
      function ar(p) {
        return [p.x, p.y]
      }
      var corners = {
        tl: scaleOverviewPoint(configuration.overviewTL),
        tr: scaleOverviewPoint(configuration.overviewTR),
        bl: scaleOverviewPoint(configuration.overviewBL),
        br: scaleOverviewPoint(configuration.overviewBR),
      };
      var sides = {
        top: distance(corners.tl, corners.tr),
        right: distance(corners.tr, corners.br),
        bottom: distance(corners.br, corners.bl),
        left: distance(corners.bl, corners.tl)
      };
      var ratio = configuration.sizeRatio,
          widthAverage = (sides.top + sides.bottom) / 2,
          widthScale = widthAverage / ratio,
          heightScale = (sides.left + sides.right) / 2,
          scale = (widthScale + heightScale) / 2,
          pts1 = [
            ar(corners.tl), ar(corners.tr), ar(corners.br), ar(corners.bl)
          ],
          sr = scale * ratio,
          pts2 = [[0,0], [sr, 0], [sr, scale], [0, scale]],
          homography = rectify.homography(pts2, pts1);

      console.log('pts1: ' + pts1);
      console.log('pts2: ' + pts2);

      var fullCanvas = new fabric.StaticCanvas('full-image');
      fabric.Image.fromURL(configuration.imageURL, function(image) {
        fullCanvas.add(image);
        fullCanvas.setWidth(image.width);
        fullCanvas.setHeight(image.height);
        image.center();
        fullCanvas.renderAll();
        var context = fullCanvas.getContext(),
            newImage = rectify.rectify(context, homography, sr, scale),
            saveCanvas = new fabric.StaticCanvas('rectify');
        saveCanvas.setWidth(sr);
        saveCanvas.setHeight(scale);
        saveCanvas.getContext().putImageData(newImage, 0, 0);
      });
    },
  });

  var Router = Backbone.Router.extend({
    views: {
      start: new StartView(),
      overview: new OverviewView(),
      corners: new CornersView(),
      rectify: new RectifyView(),
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
    screens: ['start', 'overview', 'corners', 'rectify']
  });
  router = new Router({ navigation: navigation });
  Backbone.history.start();
  Backbone.history.navigate('');
});
