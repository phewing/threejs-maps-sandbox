// TODO need to clean up to module so theres not all these global variables floating aronud
var timeZoneThere, offsetThere, utcZero;
var daysOfMonth = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
var placeMap, placeMapCanvas, placeMapContext;

var googleMap, googleMapCenter, geocoder, infoWindow;
var pixelsPerTile = 256;
var tilesPerSide = 7; // odd number please
var tilesPerSideSquared = tilesPerSide * tilesPerSide;
var opacity = 0.85;
var declination = 23.439281 * d2r;
var lightDirectional;
var objectScale = 1;
var pi2 = pi * 2;
var pi05 = pi * 0.5;
// Start with lat and long undefined
var latitude,longitude;
var lightHelper;
var clippingPlane;

var pi = Math.PI;
var d2r = pi / 180;
// For sun path
var hour,date,month,UTCOffset;

var equatorialRadius = 6378137.0;  // in meters
var polarRadius = 6356752.3142; // in meters
var inverseFlattening = 298.257223563;
var eccentricitySquared = 0.00669437999014;

var earthCircumference = 2 * pi * equatorialRadius;

var min_x = 999999, max_x = -999999;
var min_y = 999999, max_y = -999999;


// mapDiv = document.body.appendChild( document.createElement( 'div' ) );
// mapDiv.id = 'mapDiv';

class googleMapOverlay extends speedBaseClass
	{
		constructor(scene)
		{
			super(scene)
		}

		updateMap(longitude,latitude,mapType,isSI,size)
		{
		this.sceneRemove();

		this.zoom = 21;

		this.longitude = longitude;
		this.latitude = latitude;
		this.mapType = mapType;
		this.isSI = isSI;
		this.size = size;

		this.geometry = drawMapOverlay(longitude,latitude,mapType,isSI,size);

		this.sceneAdd();

		}
	}


class sunPath extends speedBaseClass
{
	constructor(scene)
	{
		super(scene);

			this.suns = [];
	}

	changeLocation(longitude,latitude,sunPathRadius,UTCOffset,theBuilding)
	{

	this.longitude = longitude;
	this.latitude = latitude;
	this.sunPathRadius = sunPathRadius;
	this.UTCOffset = UTCOffset;
	this.sunPathRadius = sunPathRadius;

	this.theBuilding = theBuilding;

	this.target = theBuilding.geometry;

	this.sceneRemove();

		this.geometry = new THREE.Group();
	this.geometry.name = "sunPath";

	var annalemma = drawAnalemma(this.longitude,this.latitude,this.sunPathRadius,this.UTCOffset);

	var compass = drawCompass();

		// Sun is added a property as we will frequently have to modify it
	this.geometry.add(annalemma);

	this.geometry.add(compass);
		// Add one sun by default
	this.addSun();

		//console.log(this.geometry,'sun Path geo')
	this.sceneAdd();

		function drawAnalemma(longitude, latitude,sunPathRadius,UTCOffset) {
				// -1 is used with latitude to flip the annalemma
				var year, month, date, hours, hour;
				var geometry, vertices, material, line;
				var analemmaDateUTC, analemmaSunPosition, analemmaColor, placard;
				var dateUTC;
				var colors;
				colors = [ 'bisque', 'deeppink', 'sienna', 'darkorange', 'indigo', 'lime',
				'purple', 'honeydew', 'coral', 'gold', 'gray', 'maroon' ];

				var analemma = new THREE.Object3D();
				analemma.name = 'analemma';

				year = ( new Date() ).getUTCFullYear();
				for ( hours = 0; hours < 24; hours++ ) {
					geometry = new THREE.Geometry();
					vertices = geometry.vertices;
					hour = hours;
					let i = 0;

					for ( month = 0; month < 12; month++ ) {
						for ( date = 1; date < daysOfMonth[ month ]; date++ ) {

							analemma.sunPosition = getSunPositionXYZ( sunPathRadius, month, date, hour, latitude, longitude, UTCOffset );

							vertices.push( analemma.sunPosition.xyz );
							geometry.colors[ i++ ] = new THREE.Color(  colors[ month ] );
						}
					}
					analemmaColor = hours === 0 ? 200 : 120;
					analemmaColor = hours === 12 ? 60 : analemmaColor;
					material = new THREE.LineBasicMaterial( {
						linewidth: 2,
						//				color: 0xffffff,
						vertexColors: THREE.VertexColors
					} );
					line = new THREE.Line( geometry, material );
					analemma.add( line );
					placard = drawPlacard( '' + hours, 0.2, analemmaColor, vertices[ 0 ].x, vertices[ 0 ].y, vertices[ 0 ].z );
					analemma.add( placard );
				}
				material = new THREE.LineBasicMaterial( { color: 0xbbbbbb } );
				for ( month = 5; month < 12; month++ ) {
					geometry = new THREE.Geometry();
					vertices = geometry.vertices;
					for ( hours = 0; hours < 24; hours++ ) {
						analemmaDateUTC = new Date( Date.UTC( year, month, 21, hours, 0, 0 ) );
						analemmaSunPosition = getSunPositionXYZ( sunPathRadius, month, 21, hours, latitude, longitude, UTCOffset );
						vertices.push( analemmaSunPosition.xyz );
					}
					vertices.push( vertices[ 0 ] );
					line = new THREE.Line( geometry, material );
					analemma.add( line );
				}
				dateUTC = new Date( Date.UTC( year, 5, 21, 12, 0, 0 ) );  // vernal equinox

			return analemma;
			}

		function drawCompass()
		{

			var compass = new THREE.Group();
			compass.name ="compass";
				var circle1_r = Math.max(max_x - min_x, max_y - min_y) / 2;
				var circle2_r = circle1_r - 20;
				var circle3_r = circle2_r - 10;

				var line1 = drawCircle(circle1_r);
				var line2 = drawCircle(circle2_r);
				var line3 = drawCircle(circle3_r);

			compass.add(line1);
			compass.add(line2);
			compass.add(line3);

				var compassDirections = drawGraduation(circle1_r, circle3_r);

			compass.add(compassDirections);

			return compass;


			function drawCircle(radius)
			{
				var circleShape = new THREE.Shape();
				var circleGeo = new THREE.CircleGeometry( radius, 100 );

				circleGeo.vertices.splice(0, 1);
				circleGeo.vertices.push(circleGeo.vertices[0]);

				var line = new THREE.Line( circleGeo, new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 3 } ) );

				line.position.set(0, 0, 0);

			return line;
			}

			function drawGraduation(r1, r2)
			{
				compassDirections = new THREE.Group();

				var loader = new THREE.FontLoader();

				loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font )
				{
					var lineGeometry = new THREE.BufferGeometry();
					var points = [];
					var textMaterial = new THREE.MeshPhongMaterial({color : 0x111111});

					for(var i = 0; i < 12; i ++)
					{
						var angle 	= Math.PI * 2 / 12 * i;
						var r 		= r1;

						if(i % 3 == 0)
							r 		= r1 + 10;

						var x1 		= r  * Math.cos(angle);
						var y1 		= r  * Math.sin(angle);

						var x2 		= r2 * Math.cos(angle);
						var y2 		= r2 * Math.sin(angle);

						var title 	= 12 - i - 9;

						if(title < 1)
							title 	= 24 - i - 9;

						var shapes 	= font.generateShapes( title, 10, 1 );
						var textGeo = new THREE.ShapeGeometry( shapes );
						var textMesh= new THREE.Mesh( textGeo, textMaterial );

						textGeo.center();

						var size_x 	= textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;
						var size_y  = textGeo.boundingBox.max.y - textGeo.boundingBox.min.y;

						points.push(x1, y1, 0);
						points.push(x2, y2, 0);

						textMesh.position.set((r1 + 15) * Math.cos(angle), (r1 + 15) * Math.sin(angle), 0);
						compassDirections.add(textMesh);
					}

					lineGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( points, 3 ) );

					var line = new THREE.LineSegments( lineGeometry, new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 3 } ) );

					compassDirections.add(line);
				});

			return compassDirections;
			}
		}
	}

	clearSuns()
	{
	this.suns = [];
		//console.log(this.geometry.children,'sunpath geometry')
		for (i = 0; i < this.geometry.children.length; i++) {
			if (this.geometry.children[i].name == "sun")
				(
					this.geometry.children.splice(i, 1)
			);
		}
	}

	addSun()
	{
		// The target is the geometry of the speed Building (this.theBuilding.geometry)
	var sun = new speedSun(this);

	this.geometry.add(sun.geometry);

	this.suns.push(sun);
	}

	sunRange()
	{
					// console.log("executing shadow range")
					// //var sun, sunHelper, dateThere, d;
					// let geometry, material, mesh;
					// // Remove the directional light from the scene
					//
					// // Remove any existing suns in the geometry a sun is just a THREE js group with a round sphere as geometry and a directional light

				this.clearSuns();

					//arguments 0 is sunRangeType

					switch (arguments[0])
					{
						case sunRangeEnumeration.byDay:
						let day = arguments[1];
							// So run the analysis for every hour of the 15th day of this month
							console.log(day,"this is the day")

							break;
						case sunRangeEnumeration.byMonth:
						let month = arguments[1];
							// So run the analysis for every hour of the 15th day of this month
							// Sun positions format = month,date,hour
						drawSunRange(this,[month,15]);

							break;
						case sunRangeEnumeration.byWinter:
							// Run the analysis for every hour of the 15th day of Dec,Jan,Feb

							break;
						default:
							throw "Invalid sun range selected!"
							break;
					}

					function drawSunRange(sunPath)
					{
						// Change the ambient light color to match what Theo had if you want
						// lightAmbient = new THREE.AmbientLight();
						// let c = 100;
						// lightAmbient.color = new THREE.Color( 'rgb( ' + c + ',' + c + ',' + c + ' )' );
						// lightAmbient.color = new THREE.Color( 'white' );

						// Ground must be set to visible
					ground.visible = true;
						ground.geometry.receiveShadow = true;
						ground.geometry.material.color.set( 0xffffff );
						ground.geometry.material.needsUpdate = true;

						// for ( surface of theBuilding.geometry.children ) {
						// 		surface.material.color.set( 0xffffff );
						//
						// 		surface.material.needsUpdate = true;
						// 	}

						// TODO We can only draw 16 suns at a time so lets do that Juan we need you to work out how to gradually add up the shadows?
						// i must at 1 as arg 0 is the sun path
						for (let i = 1; i < arguments.length; i++)
						{
							for (let j = 0; j < 16; j++)
							{
								sunPath.addSun()
								// Set the position of the last sun that was just added
								// Sun positions format in arguements = month,date
							let month = arguments[i][0];
							let date = arguments[i][1];
								// Start at 5 am and finish at 9 pm - TODO eventually we will need to work out for what hours in that day there
								// actually is sun this will do for now
								hour = 4+j

								sunPath.suns[j].setSunPosition( month, date,hour);
							}
						}
					}
	}
}

class speedSun
{
	constructor(sunPath)
	{
		this.sunPath = sunPath;

			this.geometry = new THREE.Group();
		this.geometry.name = "sun";

		this.createSun(this.sunPath.sunPathRadius,this.sunPath.target);
	}

	setSunPosition( month, date, hour)
	{

		let d, year, dateThere;

		year = new Date().getUTCFullYear();

		// Get the sun from the sunpath geometry - it will always be 2 as it is the last added child

	let newSunPosition = getSunPositionXYZ( this.sunPath.sunPathRadius, month + 1, date + 1, hour + 1, this.sunPath.latitude, this.sunPath.longitude, this.sunPath.UTCOffset).xyz;

		//console.log(newSunPosition,'new sun position')

		// Directional Light
		this.geometry.children[0].position.copy(newSunPosition);
		// // SunGeometry (Yellow ball)
		this.geometry.children[1].position.copy(newSunPosition);

		// According to Three js docs directional light is automatically a point source

		//lightDirectional.position.set(sun.position.x, sun.position.y, sun.position.z);
		//this.geometry.sun.lightDirectional.position.copy( this.geometry.sun.userData.position.xyz);

		// lightHelper.update()
		// Set directional Light to a point source
		// lightDirectional.userData.position = getSunPositionXYZ( 9999, dateThere, -1*latitude, longitude );
		// lightDirectional.position.copy(lightDirectional.userData.position.xyz)

		// lightDirectional.castShadow = sun.position.y > 0 ? true : false;

		// lightDirectional.intensity = sun.position.y > 0 ? sunIntensity : 0;
	}

	createSun(sunPathRadius,sunTarget)
	{
		var geometry, material, d;

		geometry = new THREE.SphereBufferGeometry( 6, 40, 20 );
		material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
		var sunGeo = new THREE.Mesh( geometry, material );
	sunGeo.name = "sunGeometry";
		//sunGeo.position.set( 0, 149597870700, 0 ); // 1 astronomical unit
		sunGeo.position.set( 0, 0, 0 );

		// According to Three js docs directional light is automatically a point source
		lightDirectional = new THREE.DirectionalLight( 0xffffff, 0.5  );
	lightDirectional.name = "sunlight";
		//lightDirectional.position.set( 0, 149597870700, 0 );
		lightDirectional.castShadow = true;
		lightDirectional.intensity = 0.2;

		lightDirectional.shadow.mapSize.width = 1024;
		lightDirectional.shadow.mapSize.height = 1024;

		lightDirectional.shadow.camera.near = 50;
		lightDirectional.shadow.camera.far = 1500;
		// NOTE Adjust the numbers below change the shadow
		lightDirectional.shadow.camera.fov = 30;
		lightDirectional.shadow.penumbra = 1;

		lightDirectional.shadow.camera.scale.set( 0.2 * sunPathRadius, 0.2 * sunPathRadius, 0.01 * sunPathRadius );
	lightDirectional.target = sunTarget;
		lightDirectional.shadow.bias = 0.0001;
		lightDirectional.shadow.mapSize.width = 2048;
		lightDirectional.shadow.mapSize.height = 2048;
		lightDirectional.shadow.camera.near = 50;
		lightDirectional.shadow.camera.far = 250;

	this.geometry.add(lightDirectional);
	this.geometry.add(sunGeo);

	}
}

// TODO make into modules

function drawMapOverlay(longitude, latitude, mapType, isSI, size) {

	var tilesPerSide = 7; // odd number please
	var tilesPerSideSquared = tilesPerSide * tilesPerSide;
	var pixelsPerTile = 256;
	var zoom = 21;

	const mapTypes = [
			['Google Maps','https://mt1.google.com/vt/x='],
			['Google Maps Terrain','https://mt1.google.com/vt/lyrs=t&x='],
			['Google Maps Satellite','https://mt1.google.com/vt/lyrs=s&x='],
			['Google Maps Hybrid','https://mt1.google.com/vt/lyrs=y&x='],
		];

	var geometry, material, mesh;
	geometry = new THREE.PlaneBufferGeometry( size , size );
	geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI ) );
	material = new THREE.MeshPhongMaterial();
	placeMap = new THREE.Mesh( geometry, material );
	placeMap.name = "placemap";
	placeMap.receiveShadow = true;
	placeMap.position.z = -1;

	var groundExtent = 2 * size / 3.28084; // assuming scene is being described in feet;
	var metersPerPx = metersPerPixel(latitude, zoom);
	var metersPerTile = metersPerPx * 256;

	tilesPerSide = Math.ceil(groundExtent / metersPerTile);

	// Adjust zoom and tilesPerSide to avoid having to load too many tiles at once.
	if (tilesPerSide > 8) {
		while (tilesPerSide > 8) {
			zoom--;
			metersPerPx = metersPerPixel(latitude, zoom);
			metersPerTile = metersPerPx * 256;
			tilesPerSide = Math.ceil(groundExtent / metersPerTile);
		}
	}

	tilesPerSideSquared = tilesPerSide * tilesPerSide;

	// Create texture for the canvas overlay
	placeMapCanvas = document.createElement( 'canvas' );
	placeMapCanvas.width = placeMapCanvas.height = pixelsPerTile * tilesPerSide;
	//document.body.appendChild( placeMapCanvas );
	//placeMapCanvas.style.cssText = 'border: 1px solid white; left: 0; margin: 10px auto; position: absolute; right: 0; z-index:-10;';
	placeMapContext = placeMapCanvas.getContext( '2d' );

	var baseURL, tileX, tileY, tileOffset, count;
	//if ( placeMap.visible === false ) { return; }
	baseURL = mapTypes[ mapType ][ 1 ];

	tileOffset = Math.floor( 0.5 * tilesPerSide );

	tileX = Math.floor(lon2tile(longitude, zoom)) - tileOffset;
	tileY = Math.floor(lat2tile(latitude, zoom)) - tileOffset;

	var pxOffsetX = (lon2tile(longitude, zoom) - Math.floor(lon2tile(longitude, zoom)));
var pxOffsetY = (lat2tile(longitude, zoom) - Math.floor(lat2tile(longitude, zoom)));

	//outZoom.value = zoom;
	//mapCopyright.innerHTML = 'Map graphics copyright ' + mapTypes[ selMap.selectedIndex ][ 0 ];
	count = 0;
	for ( var x = 0; x < tilesPerSide + 1; x++ ) {
		for ( var y = 0; y < tilesPerSide + 1; y++ ) {
			loadImage( ( x + tileX ) + '&y=' + ( y + tileY ) + '&z=' + zoom, x, y, pxOffsetX, pxOffsetY, baseURL );
		console.log("Loading tile (&x=" + (x + tileX) + "&y=" + (y + tileY) + "&z=" + zoom + ")" );

			// if ( selMap.selectedIndex < 4 ) {
			// 	loadImage( ( x + tileX ) + '&y=' + ( y + tileY ) + '&z=' + zoom, x, y );
			// }
			// else {
			// 	loadImage( zoom + '/' + ( x + tileX ) + '/' + ( y + tileY ) + '.png', x , y );
			// }
		}
	}

	// Map needs to be flipped to get directions right
	placeMap.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI) );

return placeMap;

	function loadImage( fileName, x, y, xOffset, yOffset, baseURL) {
		var img = document.createElement( 'img' );
		img.crossOrigin = 'anonymous';

		var texture = new THREE.Texture( placeMapCanvas );
		texture.minFilter = texture.magFilter = THREE.NearestFilter;
		texture.needsUpdate = true;
		img.onload = function() {

			placeMapContext.drawImage( img, xOffset, yOffset , 256 + xOffset, 256 + yOffset, x * pixelsPerTile, y * pixelsPerTile, pixelsPerTile, pixelsPerTile);

			count++;
			if ( count === tilesPerSideSquared ) {
				placeMap.material = new THREE.MeshLambertMaterial( { color: 0xffffff, map: texture, side: 2, opacity: opacity , transparent: true } );
				placeMap.material.needsUpdate = true;
			}
		}
		img.src = baseURL + fileName;
	}
}

	function drawPlacard( text, scale, color, x, y, z ) {
		// 2016-02-27 ~ https://github.com/jaanga/jaanga.github.io/tree/master/cookbook-threejs/functions/placards
		var placard = new THREE.Object3D();
		var texture = canvasMultilineText( text, { backgroundColor: color }   );
		var spriteMaterial = new THREE.SpriteMaterial( { map: texture, opacity: 0.9, transparent: true } );
		var sprite = new THREE.Sprite( spriteMaterial );
		sprite.position.set( x * 1.1, y * 1.1, z * 1.1) ;
		sprite.scale.set( scale * texture.image.width, scale * texture.image.height );
		/*
				var geometry = new THREE.Geometry();
				geometry.vertices = [ v( 0, 0, 0 ),  v( x, y, z ) ];
				var material = new THREE.LineBasicMaterial( { color: 0xaaaaaa } );
				var line = new THREE.Line( geometry, material );
		*/
		placard.add( sprite /*,  line */ );
		return placard;

		function canvasMultilineText( textArray, parameters ) {
			var parameters = parameters || {} ;
			var canvas = document.createElement( 'canvas' );
			var context = canvas.getContext( '2d' );
			var width = parameters.width ? parameters.width : 0;
			var font = parameters.font ? parameters.font : '48px monospace';
			var color = parameters.backgroundColor ? parameters.backgroundColor : 120 ;
			if ( typeof textArray === 'string' ) textArray = [ textArray ];
			context.font = font;
			for ( var i = 0; i < textArray.length; i++) {
				width = context.measureText( textArray[ i ] ).width > width ? context.measureText( textArray[ i ] ).width : width;
			}
			canvas.width = width + 20;
			canvas.height =  parameters.height ? parameters.height : textArray.length * 60;
			context.fillStyle = 'hsl( ' + color + ', 80%, 50% )' ;
			context.fillRect( 0, 0, canvas.width, canvas.height);
			context.lineWidth = 1 ;
			context.strokeStyle = '#000';
			context.strokeRect( 0, 0, canvas.width, canvas.height );
			context.fillStyle = '#000' ;
			context.font = font;
			for ( i = 0; i < textArray.length; i++) {
				context.fillText( textArray[ i ], 10, 48  + i * 60 );
			}
			var texture = new THREE.Texture( canvas );
			texture.minFilter = texture.magFilter = THREE.NearestFilter;
			texture.needsUpdate = true;
			return texture;
		}
	}

	function geocodeLatLng() {
		geocoder.geocode( { 'location': googleMapCenter }, function( results, status ) {
		if ( status === google.maps.GeocoderStatus.OK ) {
			if ( results[ 1 ] ) {
				inpAddress.value = results[1].formatted_address;
				//					infoWindow.open( googleMap, marker );
			} else {
				window.alert( 'No results found' );
			}
		} else {
			window.alert( 'Geocoder failed due to: ' + status );
		}
	});}

	// Location
function setCenter() {
	googleMapCenter = { lat: parseFloat( inpLatitude.value ), lng: parseFloat( inpLongitude.value ) };
	googleMap.setCenter( googleMapCenter );

	googleMap.setZoom( zoom );
	geocodeLatLng();
	messagePlace.innerHTML = 'Now click in this box & select a location from the drop-down list';
}

// Three.js

////

function buildingShadows(theBuilding,toogle)
{
	if (toogle)
	{
			theBuilding.adjbuildings.castShadow = true;
			theBuilding.adjbuildings.receiveShadow = true;

			theBuilding.adjbuildings.traverse(function(child)
			{
				child.castShadow = true;
				child.receiveShadow = true;
			});

			theBuilding.geometry.traverse( function ( child ) {
				// We dont need line segments casting shadows
				if (child.type === "Mesh" || child.type === "Group")
				{
					child.castShadow = true;
					child.receiveShadow = true;
				}
			} );
	}
	else {
		theBuilding.adjbuildings.castShadow = false;
		theBuilding.adjbuildings.receiveShadow = false;

		theBuilding.adjbuildings.traverse(function(child)
		{
			child.castShadow = false;
			child.receiveShadow = false;
		});

		theBuilding.geometry.traverse( function ( child ) {
			// We dont need line segments casting shadows
			if (child.type === "Mesh" || child.type === "Group")
			{
			child.castShadow = false;
				child.receiveShadow = false;
			}
	});
	}
}

function getSunPositionXYZ( radius, month, date, hour, latitude, longitude) {

	let sunPosition, x, y, z;
	sunPosition = getSunPosition( month, date, hour, latitude, longitude,UTCOffset);

	x = radius * Math.sin( (90 - sunPosition.altitude) * d2r ) * Math.cos( -(sunPosition.azimuth + 270) * d2r );
	y = radius * Math.sin( (90 - sunPosition.altitude) * d2r ) * Math.sin( -(sunPosition.azimuth + 270) * d2r );
	z = radius * Math.cos( (90 - sunPosition.altitude) * d2r );

	min_x = Math.min(min_x, x);
	max_x = Math.max(max_x, x);

	min_y = Math.min(min_y, y);
	max_y = Math.max(max_y, y);

	return { xyz: new THREE.Vector3( x, y, z ), azimuth: sunPosition.azimuth, altitude: sunPosition.altitude };
}

// Google maps uses the World Geodetic System WGS84 standard for longitude and latitude values:
// https://en.wikipedia.org/wiki/World_Geodetic_System
//
// Longitude (λ) and latitude (φ) values are transformed into world (x, y) coordinates,
// based (by default) on the Mercator projection:
// https://en.wikipedia.org/wiki/Mercator_projection
//
// The transformation (λ, φ) -> (x, y) is often defined as:
//     x = R * (λ − λ0)
//     y = R * ln[ tan( π/4 + φ/2 ) ]
// where:
//     - λ0: longitude of a reference meridian, defined as 180° in Google Maps;
//     - R:  globe radii for latitude and longitude, based on the WGS 84 reference ellipsoid.
//
function lon2tile( longitude, zoom ) {

	return ( longitude + 180 ) / 360 * Math.pow( 2, zoom );
}

function lat2tile( latitude, zoom ) {
return (Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI/180))/Math.PI) / 2 * Math.pow(2,zoom)));
}

function getMercatorX(longitude, refLng = -180.0) {
	return (longitude - refLng) / 360;
}

function getMercatorY(latitude) {
	var typicalCalc = Math.log(Math.tan((pi / 4.0) + (latitude * (pi / 180) / 2)));
	if (typicalCalc < 0) {
		return 0.5 - (typicalCalc / 2);
	}
	else {
		return typicalCalc / 2;
	}
}

function mercatorXtoLng(x, refLng = -180.0) {
	return refLng + (x * 360);
}

function mercatorYtoLng(y) {
	return Math.atan(Math.exp(y)) - (pi / 2);
}

function distanceToLatitude(latitude, distance) {

	console.log("Latitude distance: " + distance);
	// var numerator = distance / unitFactor;	// convert to meters for calculation

	console.log("Latitude numerator: " + numerator);
	var oneDegreeLat = equatorialRadius * (1 - eccentricitySquared) * Math.pow((1 - eccentricitySquared * Math.pow(Math.sin(Math.abs(latitude) * (pi / 180)), 2)), -3.0/2.0) * (pi / 180);
	console.log("Distance per degree latitude: " + oneDegreeLat);

	// If the building isn't SI, it's IP; divide accordingly to work in meters internally.
	// if (!theBuilding.isSI) { distance /= 3.28084; }

	return distance / oneDegreeLat;
}

function distanceToLongitude(latitude, distance) {
	console.log("Longitude distance: " + distance);
	var oneDegreeLng = pi * equatorialRadius * Math.cos(latitude * (pi / 180))
						/ (180 * Math.sqrt(1 - eccentricitySquared * Math.pow(Math.sin(Math.abs(latitude) * (pi / 180)), 0.5)));
	console.log("Distance per degree longitude: " + oneDegreeLng);
	return distance / oneDegreeLng;
}

function metersPerPixel(latitude, zoomLevel) {
	return earthCircumference * Math.cos(latitude * (pi / 180)) / Math.pow(2, zoomLevel + 8);
}



/* Copyright 2017 Ladybug Tools authors. MIT License */

	var context

	var renderer, camera, controls, scene;
	var lightAmbient;
	// For grid and axes
	var axesHelper,directions;


	function initThreejs() {

		scene = new THREE.Scene();
		// window.innerWidth, window.innerHeight
		var width = window.innerWidth;
		var height = window.innerHeight;

		// change the html
		canvas.height = height
		canvas.width = width
		//console.log(canvas)

		renderer = new THREE.WebGLRenderer( { alpha: 1, antialias: false}  );
		renderer.setClearColor( 0xffffff, 1 );
		renderer.setSize( width, height );
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		renderer.shadowMap.soft    = true;
		renderer.shadowMap.renderReverseSided = false;
		// According to Juan set renderer so that when opacity goes below 1 you don't have the z conflict on the faces.
		renderer.sortObjects = false

		ground = new speedGround(scene)

		gridHelper = new speedGrid(scene)

		sunpath = new sunPath(scene)

		mapOverlay = new googleMapOverlay(scene)

		theBuilding = new SpeedBuilding(scene);

	   window.addEventListener( 'resize', onWindowResize, false );

		 switch (view)
		 {
			 case viewEnumeration.twod:

				 // Create 2d view
				 context = canvasThreejs.getContext( '2d' );

				 camera = new THREE.OrthographicCamera( width / -3, width / 3, height / 3, height / - 3, 1, 1000 );
				 camera.position.set( 0, 0, 200 );
				 camera.up.set( 0, 0, 1 );

				 controls = new THREE.OrbitControls( camera,canvasThreejs );
				 controls.target = new THREE.Vector3(0,0,0);
				 controls.maxDistance = 6000;

				 // Do not allow user to rotate - keep scene strictly 2D
				 controls.enableRotate = false;
				 controls.maxPolarAngle = -Math.PI;
				 controls.minPolarAngle = -Math.PI;
			 	break;
			 case viewEnumeration.threed:
				 // Create 3d view

				 context = canvasThreejs.getContext( '2d' );

				 camera = new THREE.PerspectiveCamera( 40, width / height, 1, 10000 );
				 camera.position.set( -80, -250, 200 );
				 camera.up.set( 0, 0, 1 );

				 controls = new THREE.OrbitControls( camera, canvasThreejs );
				 controls.target = new THREE.Vector3(0,0,0);
				 controls.maxDistance = 6000;
			 	break;
		 }

		lightAmbient = new THREE.AmbientLight( 0xaaaaaa );
		lightAmbient.intensity = 0.2
		scene.add( lightAmbient );

		const size = 150;
		// lightDirectional = new THREE.DirectionalLight( 0xaaaaaa );
		// lightDirectional.position.set( -size, size, size );
		// 	//		lightDirectional.shadow.camera.scale.set( 13, 15, 0.5 );
		// lightDirectional.shadow.mapSize.width = 2048;  // default 512
		// lightDirectional.shadow.mapSize.height = 2048;
		// lightDirectional.castShadow = true;

		loader = new THREE.TextureLoader();
		north = loader.load( './images/N.png' );
		north.center.set( 0.5, 0.5 );
		north.rotation = Math.PI / 2;
		east = loader.load( './images/E.png' );
		east.center.set( 0.5, 0.5 );
		east.rotation = Math.PI / 2;
		south = loader.load( './images/S.png' );
		south.center.set( 0.5, 0.5 );
		south.rotation = Math.PI / 2;
		west = loader.load( './images/W.png' );
		west.center.set( 0.5, 0.5 );
		west.rotation = Math.PI / 2;

		// scene.add(lightDirectional);
		// Hopefully this will center the view when starting
		//camera.aspect = window.innerWidth / window.innerHeight;
		//camera.updateProjectionMatrix();
		// console.log(view)
		// console.log(viewEnumeration.twod)
		// if (view === viewEnumeration.twod)
		// {
		// 	console.log("testing init event")
		// 	initEvent();
		// }
	}


	function onWindowResize() {
		console.log("re sizing window")
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		canvas.height =  window.innerHeight
		canvas.width = window.innerWidth

		renderer.setSize( window.innerWidth, window.innerHeight );
		//console.log( 'onWindowResize  window.innerWidth', window.innerWidth );
	}


	function animateThreejs() {

		requestAnimationFrame( animateThreejs );

		renderer.autoClear = true;

		controls.update();
		renderer.render( scene, camera );

		if (context.canvas.width != 0 && context.canvas.height != 0)
		{
			// console.log(context.canvas.width,'canvas width')
			// console.log(context.canvas.height,'canvas height')
			context.drawImage( renderer.domElement, 0, 0 );
		}
	}

