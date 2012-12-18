window.URL = window.URL || window.webkitURL;

required_apis = [
  window.File, window.FileReader, window.FileList, window.Blob, window.URL 
];

if (!(_.every(required_apis, _.identity))) {
  alert('The required APIs are not supported by your browser.');
}

$(function() {

  var template = function(identifier) {
    return _.template($(identifier).html());
  };

  var configuration = {
    modified: false,
    set: function(key, value) {
      this.modified = true;
      this[key] = value;
      console.log('configuration.' + key + ' = ' + value);
    }
  };

  var ScreenView = Backbone.View.extend({
    el: '#dynamic'
  });

  /*  ******* START VIEW ******* */

  var StartView = ScreenView.extend({
    template: template('#start-template'),

    render: function() {
      this.$el.html(this.template());
      this.saveRatio();
      return this;
    },

    events: {
      'change #file': 'saveImageURL',
      'change #ratio': 'saveRatio'
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
    }
  });

  /*  ******* OVERVIEW VIEW ******* */

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
        var MAX_CANVAS_HEIGHT = $(window).height()- ($('body').height() - $('.canvas-container').height() + parseInt($('.lead').css('margin-bottom'), 10));
        var MAX_CANVAS_WIDTH = $('.container').width();

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

      var cursors = {};

      if(configuration.overviewTL) cursors.tl = configuration.overviewTL;
      else cursors.tl = { x: osx, y: osy };

      if(configuration.overviewTR) cursors.tr = configuration.overviewTR;
      else cursors.tr = { x: this.canvas.width - osx, y: osy };

      if(configuration.overviewBL) cursors.bl = configuration.overviewBL;
      else cursors.bl = { x: osx, y: this.canvas.height - osy };

      if(configuration.overviewBR) cursors.br = configuration.overviewBR;
      else cursors.br = { x: this.canvas.width - osx, y: this.canvas.height - osy };

      return cursors;
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
        br: this.makeCorner(line2.get('x2'), line2.get('y2'), line2, line3)
      };

      this.canvas.add(
        this.corners.tl,
        this.corners.tr,
        this.corners.bl,
        this.corners.br
      );

      function saveCornerPositions(corners) {
        function getPos(corner) {
          return { x: corner.left, y: corner.top };
        }
        configuration.set('overviewTL', getPos(corners.tl));
        configuration.set('overviewTR', getPos(corners.tr));
        configuration.set('overviewBL', getPos(corners.bl));
        configuration.set('overviewBR', getPos(corners.br));
      }

      var canvas = this.canvas;
      this.canvas.on('object:moving', function(e) {
        var p = e.target;
        if (p.line1) p.line1.set({ 'x2': p.left, 'y2': p.top });
        if (p.line2) p.line2.set({ 'x1': p.left, 'y1': p.top });
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
    }
  });

  /*  ******* CORNERS VIEW ******* */

  var CornersView = ScreenView.extend({
    template: template('#corners-template'),

    render: function() {
      this.$el.html(this.template());
      this.renderCanvases();
      return this;
    },

    makeCanvas: function(identifier, selectedPoint, width, height) {
      function scaleOverviewPoint(point) {
        var scale = configuration.overviewScale;
        return { x: point.x / scale, y: point.y / scale };
      }
      function toPoint(xValue, yValue) {
        return { x: xValue, y: yValue };
      }
      var view = {};
      view.canvas = new fabric.Canvas(identifier, { selection: false });
      view.canvas.setHeight(height);
      view.canvas.setWidth(width);
      view.corner = scaleOverviewPoint(selectedPoint);
      view.offset = toPoint(view.corner.x - (view.canvas.width/2), view.corner.y - (view.canvas.height/2));

      fabric.Image.fromURL(configuration.imageURL, function(image) {
        image.top = image.height/2 - view.offset.y;
        image.left = image.width/2 - view.offset.x;
        view.image = image;

        view.canvas.add(image);
        image.selectable = false;
        image.sendToBack();
      });
      return view;
    },

    setupCanvases: function(){
      var MAX_CANVAS_HEIGHT = $(window).height()- ($('body').height() - $('.corners').height() + parseInt($('.lead').css('margin-bottom'), 10));
      var MAX_CANVAS_WIDTH = $('.container').width();
      var height = (MAX_CANVAS_HEIGHT / 2) - 3,
      width = (MAX_CANVAS_WIDTH / 2) - 3;

      this.TL = this.makeCanvas('topleft', configuration.overviewTL, width, height);
      this.TR = this.makeCanvas('topright', configuration.overviewTR, width, height);
      this.BL = this.makeCanvas('bottomleft', configuration.overviewBL, width, height);
      this.BR = this.makeCanvas('bottomright', configuration.overviewBR, width, height);
    },

    moveLine: function(line, offset){
      line.top = line.top - offset.y;
      line.left = line.left - offset.x;
    },

    addCursor: function(view, lineA, lineB){
      this.moveLine(lineA, view.offset);
      this.moveLine(lineB, view.offset);
      view.cursor = this.makeCorner(view.canvas.width/2, view.canvas.height/2, lineA, lineB);
      view.canvas.add(lineA);
      view.canvas.add(lineB);
      view.canvas.add(view.cursor);
      view.canvas.renderAll();
    },

    renderCanvases: function() {
      this.setupCanvases();

      var lines = {
        line1: this.makeEdge([this.TL.corner.x, this.TL.corner.y, this.TR.corner.x, this.TR.corner.y]),
        line2: this.makeEdge([this.TR.corner.x, this.TR.corner.y, this.BR.corner.x, this.BR.corner.y]),
        line3: this.makeEdge([this.BR.corner.x, this.BR.corner.y, this.BL.corner.x, this.BL.corner.y]),
        line4: this.makeEdge([this.BL.corner.x, this.BL.corner.y, this.TL.corner.x, this.TL.corner.y])
      };

      this.addCursor(this.TL, lines.line4.clone(), lines.line1.clone());
      this.addCursor(this.TR, lines.line1.clone(), lines.line2.clone());
      this.addCursor(this.BL, lines.line3.clone(), lines.line4.clone());
      this.addCursor(this.BR, lines.line2.clone(), lines.line3.clone()); 

      this.setupListeners();
    }, 

    saveCornerPosition: function(offset, point, selectedPoint) {
      function getPos(corner) {
        var scale = configuration.overviewScale;
        return { x: corner.left * scale, y: corner.top * scale};
      }

      point.top = point.top + offset.y,
      point.left = point.left + offset.x,

      configuration.set(selectedPoint, getPos(point));
    },

    updateCanvas: function(view, change){
      function offset(obj, off){
        obj.top = obj.top - off.top;
        obj.left = obj.left - off.left;
      }

      offset(view.image, change);
      offset(view.corner, change);
      offset(view.offset, change);
      view.cursor.top = view.canvas.height/2;
      view.cursor.left = view.canvas.width/2;
      view.canvas.renderAll();
    },

    setupListeners: function() {
      var view = this; 

      this.TL.canvas.on('object:modified', function(e) {
        var p = e.target;
        var change = {
          top: p.top - view.TL.canvas.height/2,
          left: p.left - view.TL.canvas.width/2
        };
        view.saveCornerPosition(view.TL.offset, p, 'overviewTL');
        view.updateCanvas(view.TL, change);
      });

      this.TR.canvas.on('object:modified', function(e) {
        var p = e.target;
        var change = {
          top: p.top - view.TR.canvas.height/2,
          left: p.left - view.TR.canvas.width/2
        };
        view.saveCornerPosition(view.TR.offset, p, 'overviewTR');
        view.updateCanvas(view.TR, change);
      });

      this.BL.canvas.on('object:modified', function(e) {
        var p = e.target;
        var change = {
          top: p.top - view.BL.canvas.height/2,
          left: p.left - view.BL.canvas.width/2
        };
        view.saveCornerPosition(view.BL.offset, p, 'overviewBL');
        view.updateCanvas(view.BL, change);
      });

      this.BR.canvas.on('object:modified', function(e) {
        var p = e.target;
        var change = {
          top: p.top - view.BR.canvas.height/2,
          left: p.left - view.BR.canvas.width/2
        };
        view.saveCornerPosition(view.BR.offset, p, 'overviewBR');
        view.updateCanvas(view.BR, change);
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
    }
  });

  /*  ******* RECTIFY VIEW ******* */

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
        return [p.x, p.y];
      }
      var corners = {
        tl: scaleOverviewPoint(configuration.overviewTL),
        tr: scaleOverviewPoint(configuration.overviewTR),
        bl: scaleOverviewPoint(configuration.overviewBL),
        br: scaleOverviewPoint(configuration.overviewBR)
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
    }
  });

  var Router = Backbone.Router.extend({
    views: {
      start: new StartView(),
      overview: new OverviewView(),
      corners: new CornersView(),
      rectify: new RectifyView()
    },

    initialize: function(options) {
      (new psnav.NavigationView({ model: options.navigation })).render();
      this.route(/^(.*)$/, 'view', this.renderView);
    },

    renderView: function(name) {
      if (!name || !configuration.modified)
        name = 'start';
      return this.views[name].render();
    }
  });

  var navigation = new psnav.Navigation({
    screens: ['start', 'overview', 'corners', 'rectify']
  });

  new Router({ navigation: navigation });
  Backbone.history.start();
  Backbone.history.navigate('start');

});
