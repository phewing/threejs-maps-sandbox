// Declare variables for viewer-related scene elements.
var renderer, sceneContainer;
var camera, controls;
var scene;

// Declare variables for physical scene elements and symbols.
var boxGeometry, boxMaterial, boxMesh;
var mapGeometry, mapMaterial, mapMesh;

var placeMap, placeMapCanvas, placeMapContext;
var lightAmbient;

var opacity = 0.85;

// Declare variables geometry scene control parameters.
var defaultPlace = "Cambridge, MA";
var defaultLatitude = 42.3592444;
var defaultLongitude = -71.0931389;

var longitude = defaultLongitude;
var latitude = defaultLatitude;

var mapWidth = 100;
var mapLength = 100;
var mapDisplay = false;
var mapType = 0;

var geocoder, origin_autocomplete;
var googleMap, googleMapCenter;

var pi = Math.PI;
var d2r = pi / 180;

var equatorialRadius = 6378137.0;  // in meters
var polarRadius = 6356752.3142; // in meters
var inverseFlattening = 298.257223563;
var eccentricitySquared = 0.00669437999014;

var earthCircumference = 2 * pi * equatorialRadius;

var min_x = 999999, max_x = -999999;
var min_y = 999999, max_y = -999999;

var pixelsPerTile = 256;
var count;

var size;
var tilesPerSide = 7; // odd number please
var tilesPerSideSquared = tilesPerSide * tilesPerSide;
var pixelsPerTile = 256;
var zoom = 21;

// You need to declare a geocoder to be able to input addresses.
geocoder = new google.maps.Geocoder();

// Add a location auto-completer for encoding the input address into
// a latitude and longitude.
//
//  var origin_autocomplete = new google.maps.places.Autocomplete(inpAddress);
// origin_autocomplete.addListener('place_changed', getNewPlace, false);

function init()
{
    // Declare a WebGL render window and add it to the web page.
    renderer = new THREE.WebGLRenderer({ alpha: 1, antialias: true });
    sceneContainer = document.getElementById('myScene');

    let viewerWidth = sceneContainer.offsetWidth;
    let viewerHeight = 0.625 * viewerWidth;

    renderer.setSize(viewerWidth, viewerHeight);
    sceneContainer.appendChild(renderer.domElement);

    // Create a camera and give it an initial position.
    camera = new THREE.PerspectiveCamera(40, viewerWidth / viewerHeight, 1, 1000);
    camera.position.set(100, 100, 100);

    // Update the WebGL render window if the browser window changes size,
    // or if the camera changes orientation.
    window.addEventListener('resize', onResizeOrReorient, false);
    window.addEventListener('orientationchange', onResizeOrReorient, false);

    // Add some controls for the camera.
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Create a new Three.js scene.
    scene = new THREE.Scene();

    // Create a 3D axis symbol and add it to the scene.
    let axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // Create some Three.js geometry.
    boxGeometry = new THREE.BoxGeometry(50, 50, 50);

    // Create a material to apply to the geometry.
    boxMaterial = new THREE.MeshNormalMaterial();

    // Convert the geometry to a Three.js mesh.
    boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

    // Add the mesh version of the geometry to the Three.js scene.
    scene.add(boxMesh);
}

function animate()
{
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

///////////////////////////////////////////////////////////////////////////////
// EVENT HANDLERS + HELPER FUNCTIONS                                         //
///////////////////////////////////////////////////////////////////////////////

function onResizeOrReorient()
{
    let viewerWidth = sceneContainer.offsetWidth;
    let viewerHeight = 0.625 * viewerWidth;

    // Resize the WebGL render window.
    renderer.setSize(viewerWidth, viewerHeight);

    // Re-orient the camera.
    camera.aspect = viewerWidth / viewerHeight;
    camera.updateProjectionMatrix();
}

function getNewPlace()
{
    var place;
    place = origin_autocomplete.getPlace();
    if (place.geometry)
    {
        // Get the location.
        googleMapCenter = place.geometry.location;

        // Get the longitude and latitude.
        latitude = inpLatitude.value = googleMapCenter.lat();
        longitude = inpLongitude.value = googleMapCenter.lng();

        // Do anything else, if need be, here.
        //     changeSite(latitude, longitude, theBuilding);
    }
    else
    { alert('You must select a valid locations from the drop-down list.'); }
}

function setCenter()
{
    googleMapCenter = { lat: parseFloat(inpLatitude.value), lng: parseFloat(inpLongitude.value) };
    geocodeLatLng();
}

function geocodeLatLng()
{
    geocoder.geocode({ 'location': googleMapCenter }, function(results, status)
    {
        if (status === google.maps.GeocoderStatus.OK)
        {
            if (results[1])
            {
                inpAddress.value = results[1].formatted_address;
                changeSite(parseFloat(inpLongitude.value), parseFloat(inpLatitude.value), theBuilding);
            }
            else
            { window.alert('No results found.'); }
        }
        else
        { window.alert('Geocoder failed due to: ' + status); }
    });
}

function changeSite(lng, lat, speedBuilding)
{
    speedBuilding.longitude = longitude = lng;
    speedBuilding.latitude = latitude = lat;
    refreshMap(lng, lat, speedBuilding)
}

function refreshMap(lng, lat, speedBuilding)
{
    var baseURL = "https://maps.googleapis.com/maps/api/timezone/json";
    var timestamp = new Date().getTime() / 1000;
    var apiCall = baseURL + "?location=" + [latitude, longitude] + '&timestamp=' + timestamp;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiCall);
    xhr.onload = function()
    {
        if (xhr.status === 200)
        { var output = JSON.parse(xhr.responseText); }
        if (output.status == 'OK')
        {
            speedBuilding.location.rawUTCOffset = output.rawOffset;
            speedBuilding.location.dstUTCOffset = output.dstOffset;
            speedBuilding.location.timeZoneID = output.timeZoneID;
            speedBuilding.location.timeZoneName = output.timeZoneName;

            // document.getElementById('ifr').contentWindow.postMessage(theBuilding, '*');
        }
        else
        { alert('Timezone request failed with a status of ' + xhr.status + ';' + ' cannot refresh map!'); }
    };
    xhr.send();
}

function drawMapOverlay(longitude, latitude, mapType, isSI, size)
{
    const mapTypes = [
        ['Google Maps','https://mt1.google.com/vt/x='],
        ['Google Maps Terrain','https://mt1.google.com/vt/lyrs=t&x='],
        ['Google Maps Satellite','https://mt1.google.com/vt/lyrs=s&x='],
        ['Google Maps Hybrid','https://mt1.google.com/vt/lyrs=y&x='],
    ];

    var geometry, material, mesh;
    geometry = new THREE.PlaneBufferGeometry( size , size );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2) );
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
    placeMapContext = placeMapCanvas.getContext( '2d' );

    var baseURL, tileX, tileY, tileOffset, count;
    baseURL = mapTypes[ mapType ][ 1 ];

    tileOffset = Math.floor( 0.5 * tilesPerSide );

    tileX = Math.floor(lon2tile(longitude, zoom)) - tileOffset;
    tileY = Math.floor(lat2tile(latitude, zoom)) - tileOffset;

    var pxOffsetX = (lon2tile(longitude, zoom) - Math.floor(lon2tile(longitude, zoom)));
    var pxOffsetY = (lat2tile(longitude, zoom) - Math.floor(lat2tile(longitude, zoom)));
    count = 0;

    for ( var x = 0; x < tilesPerSide + 1; x++ ) {
        for ( var y = 0; y < tilesPerSide + 1; y++ ) {
            loadImage( ( x + tileX ) + '&y=' + ( y + tileY ) + '&z=' + zoom, x, y, pxOffsetX, pxOffsetY, baseURL );
        }
    }

    // Map needs to be flipped to get directions right
    placeMap.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI) );

    return placeMap;
}

function loadImage( fileName, x, y, xOffset, yOffset, baseURL)
{
    var img = document.createElement( 'img' );
    img.crossOrigin = 'anonymous';

    var texture = new THREE.Texture( placeMapCanvas );
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    img.onload = function()
    {
        placeMapContext.drawImage( img, xOffset, yOffset , 256 + xOffset, 256 + yOffset, x * pixelsPerTile, y * pixelsPerTile, pixelsPerTile, pixelsPerTile);
        count++;

        if ( count === tilesPerSideSquared )
        {
            placeMap.material = new THREE.MeshLambertMaterial( { color: 0xffffff, map: texture, side: 2, opacity: opacity , transparent: true } );
            placeMap.material.needsUpdate = true;
        }
    }
    img.src = baseURL + fileName;
}

function geocodeLatLng()
{
    geocoder.geocode( { 'location': googleMapCenter }, function( results, status )
    {
        if ( status === google.maps.GeocoderStatus.OK )
        {
            if ( results[ 1 ] )
            {
                inpAddress.value = results[1].formatted_address;
            }
            else
            {
                window.alert( 'No results found' );
            }
        }
        else
        {
            window.alert( 'Geocoder failed due to: ' + status );
        }
    });
}

function setCenter()
{
    googleMapCenter = { lat: parseFloat( inpLatitude.value ), lng: parseFloat( inpLongitude.value ) };
    googleMap.setCenter( googleMapCenter );

    googleMap.setZoom( zoom );
    geocodeLatLng();
    messagePlace.innerHTML = 'Now click in this box & select a location from the drop-down list';
}

function lon2tile( longitude, zoom )
{
    return ( longitude + 180 ) / 360 * Math.pow( 2, zoom );
}

function lat2tile( latitude, zoom )
{
    return (Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI/180))/Math.PI) / 2 * Math.pow(2,zoom)));
}

function getMercatorX(longitude, refLng = -180.0)
{
    return (longitude - refLng) / 360;
}

function getMercatorY(latitude)
{
    var typicalCalc = Math.log(Math.tan((pi / 4.0) + (latitude * (pi / 180) / 2)));
    if (typicalCalc < 0) {
        return 0.5 - (typicalCalc / 2);
    }
    else
    {
        return typicalCalc / 2;
    }
}

function mercatorXtoLng(x, refLng = -180.0)
{
	return refLng + (x * 360);
}

function mercatorYtoLng(y)
{
    return Math.atan(Math.exp(y)) - (pi / 2);
}

function distanceToLatitude(latitude, distance)
{
    console.log("Latitude distance: " + distance);
    console.log("Latitude numerator: " + numerator);

    var oneDegreeLat = equatorialRadius * (1 - eccentricitySquared) * Math.pow((1 - eccentricitySquared * Math.pow(Math.sin(Math.abs(latitude) * (pi / 180)), 2)), -3.0/2.0) * (pi / 180);

    console.log("Distance per degree latitude: " + oneDegreeLat);

    return distance / oneDegreeLat;
}

function distanceToLongitude(latitude, distance)
{
    console.log("Longitude distance: " + distance);
    var oneDegreeLng = pi * equatorialRadius * Math.cos(latitude * (pi / 180))
                     / (180 * Math.sqrt(1 - eccentricitySquared * Math.pow(Math.sin(Math.abs(latitude) * (pi / 180)), 0.5)));
    console.log("Distance per degree longitude: " + oneDegreeLng);
    return distance / oneDegreeLng;
}

function metersPerPixel(latitude, zoomLevel)
{
    return earthCircumference * Math.cos(latitude * (pi / 180)) / Math.pow(2, zoomLevel + 8);
}

function initThreejs()
{
    sceneContainer = document.getElementById('myScene');

    var width = sceneContainer.offsetWidth;
    var height = 0.625 * width;

    // Create a camera and give it an initial position.
    camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
    camera.position.set(100, 100, 100);

    // Update the WebGL render window if the browser window changes size,
    // or if the camera changes orientation.
    window.addEventListener('resize', onResizeOrReorient, false);
    window.addEventListener('orientationchange', onResizeOrReorient, false);

    renderer = new THREE.WebGLRenderer( { alpha: 1, antialias: false}  );
    renderer.setClearColor( 0xffffff, 1 );
    renderer.setSize( width, height );
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.soft    = true;
    renderer.shadowMap.renderReverseSided = false;

    // According to Juan, set renderer so that when opacity goes below 1 you don't have the z conflict on the faces.
    renderer.sortObjects = false;

    sceneContainer.appendChild(renderer.domElement);

    // Add some controls for the camera.
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Add a scene and stuff to it.
    scene = new THREE.Scene();

    // Create a 3D axis symbol and add it to the scene.
    let axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // Create some Three.js geometry.
    boxGeometry = new THREE.BoxGeometry(50, 50, 50);

    // Create a material to apply to the geometry.
    boxMaterial = new THREE.MeshNormalMaterial();

    // Convert the geometry to a Three.js mesh.
    boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

    // Add the mesh version of the geometry to the Three.js scene.
    scene.add(boxMesh);

    // Add an ambient light source.
    lightAmbient = new THREE.AmbientLight( 0xaaaaaa );
    lightAmbient.intensity = 0.5;
    scene.add( lightAmbient ); 

    placeMap = drawMapOverlay(longitude, latitude, 3, true, 200);

    scene.add(placeMap);
}

function animateThreejs()
{
    requestAnimationFrame( animateThreejs );

    renderer.autoClear = true;

    controls.update();
    renderer.render( scene, camera );
}


///////////////////////////////////////////////////////////////////////////////
// INITIALIZE + ANIMATE                                                      //
///////////////////////////////////////////////////////////////////////////////