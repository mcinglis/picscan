
var rectify = rectify || new function() {

	/* comments! */
	this.rectify = function(context, homography, width, height) {

		origImage = new this.ImagePixels(context.getImageData(0, 0, context.canvas.width, context.canvas.height));
		newImage = new this.ImagePixels(context.createImageData(width, height));
		origWidth = origImage.image.width;
		origHeight = origImage.image.height;
		
		for(var i = 0; i<height; i++){
			for(var j = 0; j<width; j++){
				var p = homography.multiply( $M([[j],[i],[1]]) );
				p = p.multiply(1/p.e(3,1));
				if ((p.e(1,1) >= 0 && p.e(1,1) <= origWidth) && (p.e(2,1) >= 0 && p.e(2,1) <= origHeight)) {
					var pixel = origImage.interpPixelData(p.e(1,1),p.e(2,1));
					newImage.setPixelData(j,i, pixel);
				}
			}
		}
		
		return newImage.image;
	};

	/* comments! */
	this.homography = function(pts1, pts2) {
		var numPoints = pts1.length;
		
		var A = Matrix.Zero(2*numPoints,8);
		var b = Matrix.Zero(2*numPoints,1);
		
		for(var i = 0; i<numPoints; i++){
			A.elements[2*i]   = [ pts1[i][0], pts1[i][1], 1, 0, 0, 0, -pts1[i][0]*pts2[i][0], -pts1[i][1]*pts2[i][0]];
			A.elements[2*i+1] = [ 0, 0, 0, pts1[i][0], pts1[i][1], 1, -pts1[i][0]*pts2[i][1], -pts1[i][1]*pts2[i][1]];
			
			b.elements[2*i]   = pts2[i][0];
			b.elements[2*i+1] = pts2[i][1];
		}
		
		var x = A.inv().x(b);
		
		return $M([
			[x.elements[0][0],x.elements[1][0],x.elements[2][0]],
			[x.elements[3][0],x.elements[4][0],x.elements[5][0]],
			[x.elements[6][0],x.elements[7][0],1],
		]);
	};

	this.ImagePixels = function() {

		function ImagePixels(imageData) {
			this.image = imageData;
			this.data = this.image.data;
		}

		ImagePixels.prototype.getPixelOffset = function(x, y) {
			return 4 * ((this.image.width * y) + x);
		}
		
		ImagePixels.prototype.getPixelData = function(x, y) {
			var offset = this.getPixelOffset(x, y);
			
			return {
				r: this.data[offset],
				g: this.data[offset + 1],
				b: this.data[offset + 2],
				a: this.data[offset + 3]
			}
		}

		ImagePixels.prototype.setPixelData  = function(x, y, pixel) {
			var offset = this.getPixelOffset(x, y);
			
			this.data[offset] = pixel.r;
			this.data[offset + 1] = pixel.g;
			this.data[offset + 2] = pixel.b;
			this.data[offset + 3] = pixel.a;
		}
		
		ImagePixels.prototype.interpPixelData = function(x,y) {
			var x1 = Math.floor(x);
			var x2 = Math.ceil(x);
			var a = x - x1;
			
			var y1 = Math.floor(y);
			var y2 = Math.ceil(y);
			var b = y - y1;
			
			var p1 = this.getPixelData(x1, y1);
			var p2 = this.getPixelData(x2, y1);
			var p3 = this.getPixelData(x1, y2);
			var p4 = this.getPixelData(x2, y2);
			
			var bi = function(v) {
				return (1-a)*(1-b)*p1[v] + (1-a)*b*p2[v] + a*(1-b)*p3[v] + a*b*p4[v];
			};
			
			return {
				r: bi('r'),
				g: bi('g'),
				b: bi('b'),
				a: bi('a')
			};
		}

		return ImagePixels;
	}();
	
	this.testHomography = function() {
		result = this.homography(
			[[0,0], [1,0], [1,1], [0,1]],
			[[0,0], [1,0], [1,3], [0,3]]
		);
		expected = $M([
			[1, 0, 0],
			[0, 3, 0],
			[0, 0, 1]
		]);
		return result.eql(expected);
	}
}
