var Cross = fabric.util.createClass(fabric.Object, {

  initialize: function(options) {
    this.callSuper('initialize', options);

    this.width = 10;
    this.height = 10;

    this.w1 = this.h2 = 20;
    this.h1 = this.w2 = 2;
  },

  _render: function(ctx) {
    ctx.fillRect(-this.w1 / 2, -this.h1 / 2, this.w1, this.h1);
    ctx.fillRect(-this.w2 / 2, -this.h2 / 2, this.w2, this.h2);
    ctx.fill();
  }
  
});
