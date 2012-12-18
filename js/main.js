window.URL = window.URL || window.webkitURL;

required_apis = [
  window.File, window.FileReader, window.FileList, window.Blob, window.URL 
];

if (!(_.every(required_apis, _.identity))) {
  alert('The required APIs are not supported by your browser.');
}

$(function() {

  var debug = function(name, object) {
    console.log(name);
    console.debug(object);
  };

  var template = function(identifier) {
    return _.template($(identifier).html());
  };

  // Wrappers for convenience and loose coupling with Fabric
  var Canvas = fabric.Canvas,
      Image = fabric.Image,
      Point = fabric.Point,
      Line = fabric.Line;

  var makeCursor = function(point, configKey) {
    var cursor = new Cross({ top: point.y, left: point.x });
    cursor.configKey = configKey;
    return cursor;
  };

  var makeCursorLine = function(cursor1, cursor2) {
    var coords = [cursor1.left, cursor1.top, cursor2.left, cursor2.top],
        line = new Line(coords, {
          fill: 'yellow',
          strokeWidth: 1,
          selectable: false
        });
    cursor1.line2 = line;
    cursor2.line1 = line;
    return line;
  };

  var getMaxCanvasDims = function(identifier) {
    var containerWidth = $('.container').width(),
        windowHeight = $(window).height(),
        bodyHeight = $('body').height(),
        canvasHeight = $(identifier).height(),
        leadMargin = parseInt($('.lead').css('margin-bottom'), 10);
    return {
      height: windowHeight - (bodyHeight - canvasHeight + leadMargin),
      width: containerWidth
    };
  };

  var config = {
    modified: false,
    store: {},
    get: function(key) {
      return this.store[key];
    },
    set: function(key, value) {
      this.modified = true;
      this.store[key] = value;
      console.log('set config.' + key + ' ...');
      console.debug(value);
    },
    clear: function() {
      console.log('clearing config');
      this.store = {};
      this.modified = false;
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
      config.clear();
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
      config.set('imageURL', url);
    },

    saveRatio: function() {
      var element = $('#ratio :selected'),
      value = parseFloat(element.attr('value'));
      config.set('sizeRatio', value);
    }
  });

  /*  ******* OVERVIEW VIEW ******* */

  var OverviewView = ScreenView.extend({
    canvasId: 'overview',
    cursorOffset: 6,
    template: template('#overview-template'),

    render: function() {
      this.$el.html(this.template());
      this.renderCanvas();
      return this;
    },

    renderCanvas: function() {
      this.canvas = new Canvas(this.canvasId, { selection: false });
      var view = this;
      Image.fromURL(config.get('imageURL'), function(image) {
        view.addImage(image);
        view.addControls();
        view.canvas.renderAll();
      });
    },

    addImage: function(image) {
      var maxCanvasDims = getMaxCanvasDims('#' + this.canvasId),
          heightRatio = maxCanvasDims.height / image.height,
          widthRatio = maxCanvasDims.width / image.width,
          scale = Math.min(heightRatio, widthRatio);
      config.set('overviewScale', scale);
      image.scale(scale);
      this.canvas.setHeight(image.height * scale);
      this.canvas.setWidth(image.width * scale);
      this.canvas.add(image);
      image.center();
      image.selectable = false;
      image.sendToBack();
    },

    addControls: function() {
      var cursors = this.addCursors();
      var lines = this.addLines(cursors);
      this.addListeners();
    },

    addCursors: function() {
      var points = this.getCursorPoints(),
          cursors = this.getCursors(points);
      this.canvas.add.apply(this.canvas, _.values(cursors));
      var view = this;
      _.each(cursors, function(cursor) {
        view.saveCornerFromCursor(cursor);
      });
      return cursors;
    },

    addLines: function(cursors) {
      var lines = this.getLines(cursors);
      this.canvas.add.apply(this.canvas, _.values(lines));
      _.each(cursors, function(cursor) {
        cursor.bringToFront();
      });
      return lines;
    },

    addListeners: function() {
      var view = this;
      this.canvas.on('object:moving', function(event) {
        var cursor = event.target;
        if (cursor.line1)
          cursor.line1.set({ 'x2': cursor.left, 'y2': cursor.top });
        if (cursor.line2)
          cursor.line2.set({ 'x1': cursor.left, 'y1': cursor.top });
        view.saveCornerFromCursor(cursor);
        view.canvas.renderAll();
      });
    },

    getCanvasScale: function() {
      return config.get('overviewScale') || 1;
    },

    saveCornerFromCursor: function(cursor) {
      var canvasPoint = new Point(cursor.left, cursor.top),
          actualPoint = canvasPoint.divide(this.getCanvasScale());
      config.set(cursor.configKey, actualPoint);
    },

    scaleSavedCorner: function(key) {
      var corner = config.get(key);
      if (corner && corner.multiply)
        return corner.multiply(this.getCanvasScale());
    },

    getCursorPoints: function() {
      var canvasDim = new Point(this.canvas.width, this.canvas.height),
          offset = canvasDim.divide(this.cursorOffset);
      return {
        tl: this.scaleSavedCorner('corners.tl') ||
            new Point(offset.x, offset.y),
        tr: this.scaleSavedCorner('corners.tr') ||
            new Point(canvasDim.x - offset.x, offset.y),
        bl: this.scaleSavedCorner('corners.bl') ||
            new Point(offset.x, canvasDim.y - offset.y),
        br: this.scaleSavedCorner('corners.br') ||
            new Point(canvasDim.x - offset.x, canvasDim.y - offset.y)
      };
    },

    getCursors: function(points) {
      return {
        tl: makeCursor(points.tl, 'corners.tl'),
        tr: makeCursor(points.tr, 'corners.tr'),
        bl: makeCursor(points.bl, 'corners.bl'),
        br: makeCursor(points.br, 'corners.br')
      };
    },

    getLines: function(cursors) {
      return {
        top: makeCursorLine(cursors.tl, cursors.tr),
        right: makeCursorLine(cursors.tr, cursors.br),
        bottom: makeCursorLine(cursors.br, cursors.bl),
        left: makeCursorLine(cursors.bl, cursors.tl)
      };
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
      function toPoint(xValue, yValue) {
        return { x: xValue, y: yValue };
      }
      var view = {};
      view.canvas = new fabric.Canvas(identifier, { selection: false });
      view.canvas.setHeight(height);
      view.canvas.setWidth(width);
      view.corner = selectedPoint;
      view.offset = toPoint(view.corner.x - (view.canvas.width/2), view.corner.y - (view.canvas.height/2));

      fabric.Image.fromURL(config.get('imageURL'), function(image) {
        image.top = image.height/2 - view.offset.y;
        image.left = image.width/2 - view.offset.x;
        view.image = image;

        view.canvas.add(image);
        image.selectable = false;
        image.sendToBack();
      });
      return view;
    },

    setupCanvases: function() {
      var MAX_CANVAS_HEIGHT = $(window).height()- ($('body').height() - $('.corners').height() + parseInt($('.lead').css('margin-bottom'), 10));
      var MAX_CANVAS_WIDTH = $('.container').width();
      var height = (MAX_CANVAS_HEIGHT / 2) - 3,
          width = (MAX_CANVAS_WIDTH / 2) - 3;

      this.TL = this.makeCanvas('topleft', config.get('corners.tl'), width, height);
      this.TR = this.makeCanvas('topright', config.get('corners.tr'), width, height);
      this.BL = this.makeCanvas('bottomleft', config.get('corners.bl'), width, height);
      this.BR = this.makeCanvas('bottomright', config.get('corners.br'), width, height);
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
      point.top = point.top + offset.y,
      point.left = point.left + offset.x,
      config.set(selectedPoint, new Point(point.left, point.top));
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
        view.saveCornerPosition(view.TL.offset, p, 'corners.tl');
        view.updateCanvas(view.TL, change);
      });

      this.TR.canvas.on('object:modified', function(e) {
        var p = e.target;
        var change = {
          top: p.top - view.TR.canvas.height/2,
          left: p.left - view.TR.canvas.width/2
        };
        view.saveCornerPosition(view.TR.offset, p, 'corners.tr');
        view.updateCanvas(view.TR, change);
      });

      this.BL.canvas.on('object:modified', function(e) {
        var p = e.target;
        var change = {
          top: p.top - view.BL.canvas.height/2,
          left: p.left - view.BL.canvas.width/2
        };
        view.saveCornerPosition(view.BL.offset, p, 'corners.bl');
        view.updateCanvas(view.BL, change);
      });

      this.BR.canvas.on('object:modified', function(e) {
        var p = e.target;
        var change = {
          top: p.top - view.BR.canvas.height/2,
          left: p.left - view.BR.canvas.width/2
        };
        view.saveCornerPosition(view.BR.offset, p, 'corners.br');
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

    events: {
      'click #download': 'download'
    },

    rectify: function() {
      function distance(p1, p2) {
        var dx = Math.abs(p1.x - p2.x),
        dy = Math.abs(p1.y - p2.y);
        return Math.sqrt((dx * dx) + (dy * dy));
      }
      function ar(p) {
        return [p.x, p.y];
      }
      var corners = {
        tl: config.get('corners.tl'),
        tr: config.get('corners.tr'),
        bl: config.get('corners.bl'),
        br: config.get('corners.br')
      };
      var sides = {
        top: distance(corners.tl, corners.tr),
        right: distance(corners.tr, corners.br),
        bottom: distance(corners.br, corners.bl),
        left: distance(corners.bl, corners.tl)
      };
      var ratio = config.get('sizeRatio'),
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

      var view = this;
      var fullCanvas = new fabric.StaticCanvas('full-image');
      fabric.Image.fromURL(config.get('imageURL'), function(image) {
        fullCanvas.add(image);
        fullCanvas.setWidth(image.width);
        fullCanvas.setHeight(image.height);
        image.center();
        fullCanvas.renderAll();
        var context = fullCanvas.getContext(),
            newImage = rectify.rectify(context, homography, sr, scale);
        view.saveCanvas = new fabric.StaticCanvas('rectify');
        view.saveCanvas.setWidth(sr);
        view.saveCanvas.setHeight(scale);
        view.saveCanvas.getContext().putImageData(newImage, 0, 0);
        config.set('rectifyURL', view.saveCanvas.toDataURL());
        view.saveCanvas.getContext().putImageData(newImage, 0, 0);
      });
    },

    download: function() {
      var imageURL = config.get('rectifyURL'),
          downloadURL = imageURL.replace('image/png', 'image/octet-stream');
      window.open(downloadURL, 'download.png');
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
      if (!name || !config.modified)
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
