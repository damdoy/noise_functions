var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

var width = canvas.width;
var height = canvas.height;
var imagedata = ctx.createImageData(width, height);

var array = [];

//default parameters, used also for the gui
var Parameters = function() {
  this.noise_type = 'linear';
  this.lattice_size = 100;
  this.nb_recursions = 1;
};

//calculates iterations of noise and draw it
function draw(params)
{
   for (var i = 0; i < params.nb_recursions; i++) {

      if(params.noise_type == 'linear')
      {
         array[i] = interp_noise(width, height, Math.ceil(params.lattice_size/(i+1)), bilin_mix);
      }
      else if (params.noise_type == 'cubic')
      {
         array[i] = interp_noise(width, height, Math.ceil(params.lattice_size/(i+1)), cubic_mix);
      }
      else if(params.noise_type == 'perlin')
      {
         array[i] = perlin_noise(width, height, Math.ceil(params.lattice_size/(i+1)));
      }
      else if(params.noise_type == 'improved_perlin')
      {
         array[i] = improved_perlin_noise(width, height, Math.ceil(params.lattice_size/(i+1)));
      }
      else if(params.noise_type == 'voronoi')
      {
         array[i] = voronoi_noise(width, height, Math.ceil(params.lattice_size/(i+1)));
      }
      else if(params.noise_type == 'wood')
      {
         array[i] = improved_perlin_noise(width, height, Math.ceil(params.lattice_size/(i+1)));
      }
   }

   if(params.noise_type == 'wood'){
      for (var x = 0; x < width; x++) {
         for (var y = 0; y < height; y++) {
            var noise_value = 0
            for (var i = 0; i < params.nb_recursions; i++) {
               noise_value += 1/(i+1)*(array[i][x][y]*2-1);
            }
            var wood_value = Math.sin(Math.sqrt((x-width/2)*(x-width/2)+(y-height/2)*(y-height/2))/5+noise_value*8 )*0.5+0.5;
            var idx = (y*width+x)*4;
            var light_wood_colour = [0xb6, 0x9b, 0x4c];
            var dark_wood_colour = [0x82, 0x52, 0x01];
            imagedata.data[idx] = cubic_mix(light_wood_colour[0], dark_wood_colour[0], wood_value); //red
            imagedata.data[idx+1] = cubic_mix(light_wood_colour[1], dark_wood_colour[1], wood_value); //green
            imagedata.data[idx+2] = cubic_mix(light_wood_colour[2], dark_wood_colour[2], wood_value); //blue
            imagedata.data[idx+3] = 255; //alpha
         }
      }
   }
   else{ //simply draw the noise
      for (var x = 0; x < width; x++) {
         for (var y = 0; y < height; y++) {
            var value = 0;
            for (var i = 0; i < params.nb_recursions; i++) {
               value += 1/(i+1)*(array[i][x][y]*2-1);
            }
            value = value*0.5+0.5;
            var idx = (y*width+x)*4;
            imagedata.data[idx] = 255*value; //red
            imagedata.data[idx+1] = 255*value; //green
            imagedata.data[idx+2] = 255*value; //blue
            imagedata.data[idx+3] = 255; //alpha
         }
      }
   }

   ctx.putImageData(imagedata, 0, 0);
}

function random_noise(array, size_x, size_y, size_sub) {
   for (var i = 0; i < array.length; i++) {
      for (var j = 0; j < array[i].length; j++) {
         array[i][j] = Math.random();
      }
   }
}

function bilin_mix(x, y, a)
{
   return (1-a)*x+a*y;
}

function cubic_mix(x, y, a) //-3x^3+2x^2
{
   var ia = (1.0-a);
   var ret =  (-2.0*ia*ia*ia+3.0*ia*ia)*x+(-2.0*a*a*a+3.0*a*a)*y;
   return ret;
}

//other form of cubic mix
function ease_mix(x, y, a) //6x^5-15x^4+10x^3
{
   var ia = (1.0-a);
   var ret =  (6.0*Math.pow(ia,5)-15.0*Math.pow(ia, 4)+10.0*Math.pow(ia,3))*x+(6.0*Math.pow(a,5)-15.0*Math.pow(a, 4)+10.0*Math.pow(a,3))*y;
   return ret;
}

//will interpolate pixels between values of a coarse matrix
function interp_noise(size_x, size_y, size_sub, mix_function) {
   var coarse_array = [];
   var ret_array = [];
   if(size_sub == 0) //avoid div by 0
   {
      size_sub = 1;
   }
   //dimentions for the coarse lattice containing points
   var sub_size_x = Math.floor(size_x/size_sub);
   var sub_size_y = Math.floor(size_y/size_sub);

   for (var i = 0; i < sub_size_x+2; i++) {
      coarse_array[i] = [];
      for (var j = 0; j < sub_size_y+2; j++) {
         coarse_array[i][j] = Math.random();
      }
   }

   for (var i = 0; i < size_x; i++) {
         ret_array[i] = [];
      for (var j = 0; j < size_y; j++) {
         var lattice_x = Math.floor(i/size_sub);
         var lattice_y = Math.floor(j/size_sub);
         var x_ratio = (i%size_sub)/size_sub;
         var y_ratio = (j%size_sub)/size_sub;
         var top_val = mix_function(coarse_array[lattice_x][lattice_y], coarse_array[lattice_x+1][lattice_y], x_ratio);
         var bottom_val = mix_function(coarse_array[lattice_x][lattice_y+1], coarse_array[lattice_x+1][lattice_y+1], x_ratio);
         ret_array[i][j] = mix_function(top_val, bottom_val, y_ratio);
      }
   }
   return ret_array;
}

function dot(x, y)
{
   return x[0]*y[0]+x[1]*y[1];
}

function perlin_noise(size_x, size_y, size_sub) {
   var gradients_lattice = [];
   var sub_size_x = Math.floor(size_x/size_sub);
   var sub_size_y = Math.floor(size_y/size_sub);

   for (var i = 0; i < sub_size_x+2; i++) {
      gradients_lattice[i] = [];
      for (var j = 0; j < sub_size_y+2; j++) {
         var gradient_vec = [Math.random()*2-1.0, Math.random()*2-1.0];
         var grad_vec_size = Math.sqrt(gradient_vec[0]*gradient_vec[0]+gradient_vec[1]*gradient_vec[1]);
         gradients_lattice[i][j] = [gradient_vec[0]/grad_vec_size, gradient_vec[1]/grad_vec_size]; //normalize
      }
   }

   return gradient_noise(size_x, size_y, size_sub, gradients_lattice);
}

function improved_perlin_noise(size_x, size_y, size_sub) {
   var gradients_lattice = [];
   var sub_size_x = Math.floor(size_x/size_sub);
   var sub_size_y = Math.floor(size_y/size_sub);

   for (var i = 0; i < sub_size_x+2; i++) {
      gradients_lattice[i] = [];
      for (var j = 0; j < sub_size_y+2; j++) {
         var gradient_vec = [0, 0];
         var rand_var = Math.floor(Math.random()*3.9999);
         switch(rand_var) {
            case 0: gradient_vec = [1, 0];
               break;
            case 1: gradient_vec = [0, 1];
               break;
            case 2: gradient_vec = [-1, 0];
               break;
            case 3: gradient_vec = [0, -1];
               break;
         }
         gradients_lattice[i][j] = gradient_vec; //normalize
      }
   }

   return gradient_noise(size_x, size_y, size_sub, gradients_lattice);
}

function gradient_noise(size_x, size_y, size_sub, gradients_lattice) {
   var array = [];

   for (var i = 0; i < size_x; i++) {
      array[i] = []
      for (var j = 0; j < size_y; j++) {
         var lattice_x = Math.floor(i/size_sub);
         var lattice_y = Math.floor(j/size_sub);
         var x_ratio = (i%size_sub)/size_sub;
         var y_ratio = (j%size_sub)/size_sub;
         var top_left = dot([x_ratio, y_ratio], gradients_lattice[lattice_x][lattice_y]);
         var top_right = dot([-(1-x_ratio), y_ratio], gradients_lattice[lattice_x+1][lattice_y]);
         var bot_left = dot([x_ratio, -(1-y_ratio)], gradients_lattice[lattice_x][lattice_y+1]);
         var bot_right = dot([-(1-x_ratio), -(1-y_ratio)], gradients_lattice[lattice_x+1][lattice_y+1]);
         var top = cubic_mix(top_left, top_right, x_ratio);
         var bot = cubic_mix(bot_left, bot_right, x_ratio);
         array[i][j] = cubic_mix(top, bot, y_ratio)*0.5+0.5; //must be in [0, 1]
      }
   }
   return array;
}

//puts random points on a coarse lattice, value of pixels will be distance to nearest point
function voronoi_noise(size_x, size_y, size_sub) {
   var points_lattice = [];
   var array = [];
   if(size_sub == 0)
   {
      size_sub = 1;
   }
   var sub_size_x = Math.floor(size_x/size_sub);

   for (var i = 0; i < sub_size_x*sub_size_x; i++) {
      points_lattice[i] = [Math.random()*size_x, Math.random()*size_y];
   }

   for (var i = 0; i < size_x; i++) {
      array[i] = [];
      for (var j = 0; j < size_y; j++) {
         var nearest_point_dist = 10000000; //default
         var nearest_point = 0;

         //find distance to nearest point
         for (var k = 0; k < points_lattice.length; k++) {
            var dist = Math.sqrt(Math.pow(i-points_lattice[k][0], 2)+Math.pow(j-points_lattice[k][1], 2));
            if(dist < nearest_point_dist)
            {
               nearest_point = k;
               nearest_point_dist = dist;
            }
         }
         array[i][j] = (nearest_point_dist/(size_sub));
      }
   }

   return array;
}

//set up gui to modify parameters
var params = new Parameters();
var gui = new dat.GUI();
var controller_type = gui.add(params, 'noise_type', [ 'linear', 'cubic', 'perlin', 'improved_perlin', 'voronoi', 'wood' ] );
var controller_size = gui.add(params, 'lattice_size', 1, 600, 1);
var controller_rec = gui.add(params, 'nb_recursions', 1, 10, 1);

draw(params);

controller_type.onFinishChange(function(value) {
  draw(params);
});

controller_size.onFinishChange(function(value) {
  draw(params);
});

controller_rec.onFinishChange(function(value) {
  draw(params);
});
