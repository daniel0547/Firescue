let latitude=39.755758;
let longitude=-121.617273;

let origemicon = new L.icon({iconUrl: '/static/images/square.png', iconSize: [20,20], iconAnchor: [9,19]});
let destinoicon = new L.icon({iconUrl: '/static/images/point.png', iconSize: [20,20], iconAnchor: [9,19]});

let origem=null;
let destino=null;

function submitpoint(){
  let form = $('#input_form');
	fireArray="";
	zones.forEach((element)=>{
		element.forEach((zone)=>{
			if(zone.onfire>0){
				fireArray=fireArray+zone.center+";";
			}
		})
	});
	console.log(fireArray);
	$('#problems').val(fireArray);
	$('#origem_lat').val(origem.lat);
	$('#origem_lng').val(origem.lng);
	$('#destino_lat').val(destino.lat);
	$('#destino_lng').val(destino.lng);
  form.submit()
}

//Definição da Layer
let baseLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom: 18,
			minZoom: 16
    }
);

//Definição do mapa
let map = new L.Map('map', {
  center: new L.LatLng(latitude, longitude),
  zoom: 16,
  layers: [baseLayer]
});

map.on('click', function(e){
	let lat = e.latlng.lat;
	let lng = e.latlng.lng;
	let node = {
		lat:lat,
		lng:lng
	}
	add(node)
	console.log("Clicked " + lat + "," + lng);
});

function zeros(dimensions) {
    var array = [];

    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
    }

    return array;
}

fireAlertMatrix=zeros([49,106]);

fireAlertMatrix[27][28]=1;
fireAlertMatrix[22][23]=1;
fireAlertMatrix[27][23]=1;

function buildzones(){
	for(let y=bot_left_lat, y_index=0;y<top_right_lat;y+=lado+lado/2, y_index++){
		zones[y_index]=[];
		for(let x=bot_left_lng, x_index=0;x<top_right_lng;x+=altura, x_index++){
			if(y_index%2==0 && x_index==0){
				x+=altura/2;
			}
			let latlngs = [[y, x],[y+lado, x],[y+lado+lado/2, x+altura/2],[y+lado, x+altura],[y, x+altura],[y-lado/2, x+altura/2]];
			if(fireAlertMatrix[y_index][x_index]==1){
				let polygon = L.polygon(latlngs, {color: 'red', stroke: false, fillOpacity: 0.5}).addTo(map);
				zones[y_index][x_index]={center:[y+lado/2, x+altura/2],y_index: y_index, x_index: x_index, onfire: 1, polygon: polygon};
			}
			else{
				let polygon = L.polygon(latlngs, {color: 'green',stroke: false, fillOpacity: 0.5}).addTo(map);
				zones[y_index][x_index]={center:[y+lado/2, x+altura/2], y_index: y_index, x_index: x_index, onfire: 0, polygon: polygon};
			}
		}
	}
}


function updateWind(){
	let minlat=Math.min(top_right_lat,bot_left_lat);
	let maxlat=Math.max(top_right_lat,bot_left_lat);
	let minlng=Math.min(top_right_lng,bot_left_lng);
	let maxlng=Math.max(top_right_lng,bot_left_lng);
	let lat=minlat+((maxlat-minlat)/2);
	let lng=minlng+((maxlng-minlng)/2);
	$.ajax({
	    type: 'GET',
	    url: 'https://api.openweathermap.org/data/2.5/weather?lat='+lat+'&lon='+lng+'&APPID=94abcf122db918453f8c117b70a82e83',
	    success: function(data) {
				windspeed=data["wind"].speed;
				winddeg=data["wind"].deg;
				let minspeed=0;
				let maxspeed=100;
				let minsize=30;
				let maxsize=500;
				let sizestep=(maxsize-minsize)/(maxspeed-minspeed);
				const size=minsize+(windspeed-minspeed)*sizestep;
				let windIcon = new L.icon({iconUrl: 'static/images/arrow.png',iconSize: [size,size], iconAnchor: [size/2,size/2]});
				if(windmarker){
					map.removeLayer(windmarker);
				}
				windmarker= L.marker([lat,lng],{icon: windIcon, rotationAngle: (winddeg), opacity: 0.7}).addTo(map);
				updateFireAreas();
			}
	});
}

function updateFireAreas(){
	for(let i=0;i<zones.length;i++){
		for(let j=0;j<zones[i].length;j++){
			if(winddeg>=0 && winddeg<60){
				neighbor=getNeighbor(0,i,j);
			}
			if(winddeg>=60 && winddeg<120){
				neighbor=getNeighbor(1,i,j);
			}
			if(winddeg>=120 && winddeg<180){
				neighbor=getNeighbor(2,i,j);
			}
			if(winddeg>=180 && winddeg<240){
				neighbor=getNeighbor(3,i,j);
			}
			if(winddeg>=240 && winddeg<300){
				neighbor=getNeighbor(4,i,j);
			}
			if(winddeg>=300 && winddeg<=360){
				neighbor=getNeighbor(5,i,j);
			}
			if(typeof zones[neighbor[0]]!=='undefined' && typeof zones[neighbor[0]][neighbor[1]] !== 'undefined'){
				if(windspeed>=10.8 && windspeed<=17.1){
					if(zones[i][j].onfire==1){
						zones[neighbor[0]][neighbor[1]].onfire=0.5;
						zones[neighbor[0]][neighbor[1]].polygon.setStyle({fillColor: 'yellow'});
					}
				}
				if(windspeed>17.1 && windspeed<=24.4){
					if(zones[i][j].onfire==1){
						zones[neighbor[0]][neighbor[1]].onfire=0.7;
						zones[neighbor[0]][neighbor[1]].polygon.setStyle({fillColor: 'yellow'});
					}
					if(zones[i][j].onfire==0.7){
						zones[neighbor[0]][neighbor[1]].onfire=0.5;
						zones[neighbor[0]][neighbor[1]].polygon.setStyle({fillColor: 'yellow'});
					}
				}
			}
		}
	}
}

function getNeighbor(n_neighbor, i,j){
	if(i%2==0){
		if(n_neighbor==0){
			return [i-1, j];
		}
		if(n_neighbor==1){
			return [i,j-1];
		}
		if(n_neighbor==2){
			return [i+1,j];
		}
		if(n_neighbor==3){
			return [i+1, j+1];
		}
		if(n_neighbor==4){
			return [i, j+1];
		}
		if(n_neighbor==5){
			return [i-1, j+1];
		}
	}
	if(i%2!=0){
		if(n_neighbor==0){
			return [i-1, j-1];
		}
		if(n_neighbor==1){
			return [i, j-1];
		}
		if(n_neighbor==2){
			return [i+1,j-1];
		}
		if(n_neighbor==3){
			return [i+1, j];
		}
		if(n_neighbor==4){
			return [i, j+1];
		}
		if(n_neighbor==5){
			return [i-1, j];
		}
	}
}

function getGraph(){
	let graph=[];
	zones.forEach((element)=>{
		element.forEach((zone)=>{
			for(let n=0;n<5;n++){
				neighbor=getNeighbor(n,zone.y_index, zone.x_index);
				if(!graph[zone.y_index*zones.length+x_index]){
					graph[zone.y_index*zones.length+x_index]=[];
				}
				graph[zone.y_index*zones.length+x_index][neighbor[0]*zones.length+neighbor[1]]=1;
				if(!graph[neighbor[0]*zones.length+neighbor[1]]){
					graph[neighbor[0]*zones.length+neighbor[1]]=[];
				}
				graph[neighbor[0]*zones.length+neighbor[1]][zone.y_index*zones.length+x_index]=1;
			}
		});
	});
	return graph;
}

function add(node){
	if(origem){
		nodeObj ={
			lat:node.lat,
			lng:node.lng,
			marker: L.marker([node.lat,node.lng],{icon: destinoicon})
		}
		if(destino){
			destino.marker.removeFrom(map);
		}
		destino=nodeObj;
	}
	else{
		nodeObj ={
			lat:node.lat,
			lng:node.lng,
			marker: L.marker([node.lat,node.lng],{icon: origemicon})
		}
		origem=nodeObj;
	}
	nodeObj.marker.addTo(map);
}

const interval = setInterval(function() {
   updateWind();
 }, 10000);


bot_left_lat=39.75117689975809;
bot_left_lng=-121.630181691446;

top_right_lat=39.76089863324267;
top_right_lng= -121.60536289127778;

node_size=15;
node_cat=(node_size*Math.sqrt(3));

lado=metersdistance2degrees(node_size);
altura=metersdistance2degrees(node_cat);
let zones=[];
buildzones();

let winddeg=0;
let windspeed=0;
let windmarker=0;
updateWind();

//transformações
function degreedistance2meters(degree){
  return degree*111111;
}

function metersdistance2degrees(meters){
  return meters/111111;
}
