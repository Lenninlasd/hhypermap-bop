/*	
	Water ripple effect.
	Original code (Java) by Neil Wallis 
	@link http://www.neilwallis.com/java/water.html
	
	Original code (JS) by Sergey Chikuyonok (serge.che@gmail.com)
	@link http://chikuyonok.ru
	@link http://media.chikuyonok.ru/ripple/

	Copyright (c) 2015 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
	@link https://github.com/Viglino
 */
 /**
 * @constructor
 * @extends {ol.interaction.Pointer}
 *	@param {ol.flashlight.options} flashlight options param
 *		- color {ol.Color} light color, default transparent
 *		- fill {ol.Color} fill color, default rgba(0,0,0,0.8)
 *		- radius {number} radius of the flash
 */
ol.interaction.Ripple = function(options) 
{
	ol.interaction.Pointer.call(this, 
	{	handleDownEvent: this.rainDrop,
		handleMoveEvent: this.rainDrop
	});

	// Default options
	options = options||{};

	this.riprad = options.radius || 3;

	this.ripplemap = [];
    this.last_map = [];
    
    // Generate random ripples
    this.interval = options.interval;
	this.rains (this.interval);
};
ol.inherits(ol.interaction.Ripple, ol.interaction.Pointer);

/** Set the map > start postcompose
*/
ol.interaction.Ripple.prototype.setMap = function(map)
{	if (this.oncompose)
	{	ol.Observable.unByKey(oncompose);
		if (this.getMap()) this.getMap().render();
	}
	
	ol.interaction.Pointer.prototype.setMap.call(this, map);

	if (map)
	{	this.oncompose = map.on('postcompose', this.postcompose_, this);
	}
}

/** Generate random rain drop
*	@param {integer} interval
*/
ol.interaction.Ripple.prototype.rains = function(interval)
{	if (this.onrain) clearTimeout (this.onrain);
	var self = this;
	vdelay = (typeof(interval)=="number" ? interval : 1000)/2;
	delay = 3*vdelay/2;
	var rnd = Math.random;
	function rain() 
	{	if (self.width) self.rainDrop([rnd() * self.width, rnd() * self.height]);
		self.onrain = setTimeout (rain, rnd()*vdelay + delay);
	};
	// Start raining
	if (delay) rain();
}

/** Disturb water at specified point
*	@param {ol.Pixel|ol.MapBrowserEvent}
*/
ol.interaction.Ripple.prototype.rainDrop = function(e)
{	if (!this.width) return;
	var dx,dy;
	if (e.pixel) 
	{	dx = e.pixel[0]*this.ratio;
		dy = e.pixel[1]*this.ratio;
	}
	else 
	{	dx = e[0]*this.ratio;
		dy = e[1]*this.ratio;
	}
	dx <<= 0;
    dy <<= 0;
    
    for (var j = dy - this.riprad*this.ratio; j < dy + this.riprad*this.ratio; j++) 
	{   for (var k = dx - this.riprad*this.ratio; k < dx + this.riprad*this.ratio; k++) 
		{   this.ripplemap[this.oldind + (j * this.width) + k] += 128;
        }
    }
}

/** Postcompose function
*/
ol.interaction.Ripple.prototype.postcompose_ = function(e)
{	var ctx = e.context;
	var canvas = ctx.canvas;
	
	// Initialize when canvas is ready / modified
	if (this.width != canvas.width || this.height != canvas.height)
	{	this.width = canvas.width;
		this.height = canvas.height;
		this.ratio = e.frameState.pixelRatio;
		this.half_width = this.width >> 1;
		this.half_height = this.height >> 1;
		this.size = this.width * (this.height + 2) * 2;
		this.oldind = this.width;
		this.newind = this.width * (this.height + 3);
		for (var i = 0; i < this.size; i++) {
			this.last_map[i] = this.ripplemap[i] = 0;
		}
	}
	this.texture = ctx.getImageData(0, 0, this.width, this.height);
	this.ripple = ctx.getImageData(0, 0, this.width, this.height);	

	// Run animation
	var a, b, data, cur_pixel, new_pixel;
    
    var t = this.oldind; this.oldind = this.newind; this.newind = t;
    var i = 0;
    var _rd = this.ripple.data,
        _td = this.texture.data;
    
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            var _newind = this.newind + i,
				_mapind = this.oldind + i;
            data = (
                this.ripplemap[_mapind - this.width] + 
                this.ripplemap[_mapind + this.width] + 
                this.ripplemap[_mapind - 1] + 
                this.ripplemap[_mapind + 1]) >> 1;
                
            data -= this.ripplemap[_newind];
            data -= data >> 5;
            
            this.ripplemap[_newind] = data;

            //where data=0 then still, where data>0 then wave
            data = 1024 - data;
            
            if (this.last_map[i] != data) 
			{   this.last_map[i] = data;
				
				//offsets
                a = (((x - this.half_width) * data / 1024) << 0) + this.half_width;
                b = (((y - this.half_height) * data / 1024) << 0) + this.half_height;

                //bounds check
                if (a >= this.width) a = this.width - 1;
                if (a < 0) a = 0;
                if (b >= this.height) b = this.height - 1;
                if (b < 0) b = 0;

                new_pixel = (a + (b * this.width)) * 4;
                cur_pixel = i * 4;

				/**/
                _rd[cur_pixel] = _td[new_pixel];
                _rd[cur_pixel + 1] = _td[new_pixel + 1];
                _rd[cur_pixel + 2] = _td[new_pixel + 2];

				/*/
				// only in blue pixels 
                if (_td[new_pixel + 2]>_td[new_pixel + 1]
					&& _td[new_pixel + 2]>_td[new_pixel])
				{
                _rd[cur_pixel] = _td[new_pixel];
                _rd[cur_pixel + 1] = _td[new_pixel + 1];
                _rd[cur_pixel + 2] = _td[new_pixel + 2];
				}
				else this.ripplemap[_newind] = 0;
				/**/
            }
            
            ++i;
        }
    }
	ctx.putImageData(this.ripple, 0, 0);
	
	// tell OL3 to continue postcompose animation
	this.getMap().render(); 
};