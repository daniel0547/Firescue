from flask import render_template, request, redirect, url_for
from app import app
import requests
from openrouteservice import convert

@app.route('/')
@app.route('/index')
def index():
	return render_template('index.html')

def getexpandedareas(ps):
	features=[]
	for p in ps:
		clat=float(p[1])
		clng=float(p[0])
		d=0.0001;
		out= [
			  [
				[float(clat+d),float(clng+d)],
				[float(clat-d),float(clng+d)],
				[float(clat-d),float(clng-d)],
				[float(clat+d),float(clng-d)],
				[float(clat+d),float(clng+d)]
			  ]
			];
		features.append(out)
	out={
       "type": "MultiPolygon",
       "coordinates": features}
	print(out)
	return out;

def calcroute(p1lat,p1lng,p2lat,p2lng,problems):
	url = "https://api.openrouteservice.org/v2/directions/cycling-regular"
	problemsArray=problems.split(";");
	centerarray=[];
	for p in problemsArray:
		if(',' in p):
			lat=p.split(",")[0];
			lng=p.split(",")[1];
			centerarray.append([lat,lng]);
	body = {"coordinates":[[p1lat,p1lng],[p2lat,p2lng]], "elevation":"true", "extra_info":["steepness"],"geometry_simplify":"false","instructions":"true","instructions_format":"html","language":"pt","options":{'avoid_polygons':getexpandedareas(centerarray),"avoid_features":["ferries","steps","fords"],"profile_params":{"weightings":{"steepness_difficulty":1}}},"units":"m","continue_straight":"true","geometry":"true"}
	headers = {
	'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
	'Authorization': '5b3ce3597851110001cf6248b092059e58f0474c88618af7252a3db9'
	}
	# sending get request and saving the response as response object
	r = requests.post(url = url, json = body, headers=headers)
	print(r.json())
	geometry=r.json()['routes'][0]['geometry']
	routes=convert.decode_polyline(geometry, True)
	return routes

def decodeGeometryORS(encodedGeometry):
	length = len(encodedGeometry);
	ret=[]
	index = 0;
	lat = 0;
	lng = 0;
	ele = 0;

	while (index < length):
		print(index)
		result = 1;
		shift = 0;
		while True:
			b = ord(encodedGeometry[index]) - 63 - 1;
			index=index+1
			print(index)
			result += b << shift;
			shift += 5;
			if (b >= 0x1f):
				break;
		if (result & 1) != 0:
			lat+=~(result >> 1)
		else:
			lat += (result >> 1);
		result =1;
		shift = 0;
		while True:
			b = ord(encodedGeometry[index]) - 63 - 1;
			index=index+1
			print(index)
			result += b << shift;
			shift += 5;
			if (b >= 0x1f):
				break;
		if (result & 1) != 0:
			lng+=~(result >> 1)
		else:
			lng += (result >> 1);

		result = 1;
		shift = 0;
		while True:
			b = ord(encodedGeometry[index])- 63 - 1;
			index=index+1
			print(index)
			result += b << shift;
			shift += 5;
			if (b >= 0x1f):
				break;
		if (result & 1) != 0:
			ele+=~(result >> 1)
		else:
			ele += (result >> 1);
		ret.append({lat,lng,ele})
	return ret;

@app.route('/build', methods=['GET', 'POST'])
def build():
	if(request.form['origem_lat'] and request.form['origem_lng'] and request.form['destino_lat'] and request.form['destino_lng']):
		olat=request.form['origem_lat'];
		olng=request.form['origem_lng'];
		dlat=request.form['destino_lat'];
		dlng=request.form['destino_lng'];
		problems=request.form['problems'];
		route=calcroute(olng,olat,dlng,dlat,problems)
		points=[]
		v=0;
		ps=[]
		for p in route['coordinates']:
			if v==0:
				v=1;
				latitude=p[1];
				longitude=p[0];
			points.append([p[0],p[1],p[2]])
		return render_template('result.html', latitude=latitude, longitude=longitude, latitudedest=dlat, longitudedest=dlng, points=points);
