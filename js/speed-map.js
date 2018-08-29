///////////////////////////////////////////////////////////////////////////////
// WORLD CONSTANTS                                                           //
///////////////////////////////////////////////////////////////////////////////

const D2R = Math.PI / 180.0;
const DAYS_OF_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DECLINATION = 23.439281 * Math.PI / 180.0;
const ECCENTRICITY_SQUARED = 0.00669437999014;
const EQUATORIAL_RADIUS = 6378137.0;
const INVERSE_FLATTENING = 298.257223563;
const PI_05 = Math.PI * 0.5;
const PI_20 = Math.PI * 2.0;
const PI = Math.PI;
const POLAR_RADIUS = 6356752.3142;

///////////////////////////////////////////////////////////////////////////////
// GOOGLE MAP CONSTANTS                                                      //
///////////////////////////////////////////////////////////////////////////////

const GOOGLE_MAP_TYPES = [
  ['Google Maps', 'https://mt.google.com/vt/x='],
  ['Google Maps Terrain', 'https://mt.google.com/vt/lyrs=t&x='],
  ['Google Maps Satellite', 'https://mt.google.com/vt/lyrs=s&x='],
  ['Google Maps Hybrid', 'https://mt.google.com/vt/lyrs=y&x='],
];

const PX_PER_TILE = 256;

///////////////////////////////////////////////////////////////////////////////
// MAP OVERLAY GLOBAL VARIABLES                                              //
///////////////////////////////////////////////////////////////////////////////

var tilesLoaded = 0;

///////////////////////////////////////////////////////////////////////////////

class googleMapOverlay extends speedBaseClass
{
  constructor(scene)
  {
    super(scene);
  }

  updateMap(longitude, latitude, mapType, isSI, size)
  {
    if (!this.visibility) { return; }

    if (longitude == undefined || latitude == undefined || mapType == undefined || isSI == undefined || size == undefined) { return; }

    this.sceneRemove();

    this.longitude = longitude;
    this.latitude = latitude;
    this.mapType = mapType;
    this.isSI = isSI;
    this.sizeX = size;
    this.sizeY = size;
    this.zoom = 21;

    let main_context = this;

    drawMapOverlay(this);
  }
}

function drawMapOverlay(overlay)
{
  let mapSizeX, mapSizeY;

  if (isSI)
  {
    mapSizeX = overlay.sizeX;
    mapSizeY = overlay.sizeY;
  }
  else
  {
    mapSizeX = overlay.sizeX / 3.28084;
    mapSizeY = overlay.sizeY / 3.28084;
  }

  let metersPerPx = metersPerPixel(overlay.latitude, overlay.zoom);
  let metersPerTile = metersPerPx * PX_PER_TILE;

  let tilesPerSideX = Math.ceil(mapSizeX / metersPerTile);
  let tilesPerSideY = Math.ceil(mapSizeY / metersPerTile);

  // Adjust zoom and tilesPerSide to avoid having to load too many tiles at once.
  if (tilesPerSideX > 7 || tilesPerSideY > 7)
  {
    while (tilesPerSideX > 7 || tilesPerSideY > 7)
    {
      overlay.zoom--;
      metersPerPx = metersPerPixel(latitude, overlay.zoom);
      metersPerTile = metersPerPx * 256;
      tilesPerSideX = Math.ceil(mapSizeX / metersPerTile);
      tilesPerSideY = Math.ceil(mapSizeY / metersPerTile);
    }
  }

  let totalNumOfTiles = tilesPerSide * tilesPerSide;

  let tileOffsetX = Math.floor(0.5 * tilesPerSideX);
  let tileOffsetY = Math.floor(0.5 * tilesPerSideY);

  let startTileX = Math.floor(lon2tile(overlay.longitude, overlay.zoom)) - tileOffsetX;
  let startTileY = Math.floor(lat2tile(overlay.latitude, overlay.zoom)) - tileOffsetY;

  let pxOffsetX = (lon2tile(overlay.longitude, overlay.zoom) - Math.floor(lon2tile(overlay.longitude, overlay.zoom))) * PX_PER_TILE;
  let pxOffsetY = (lat2tile(overlay.latitude, overlay.zoom) - Math.floor(lat2tile(overlay.latitude, overlay.zoom))) * PX_PER_TILE;

  let canvas = document.createElement('canvas');
  canvas.width  = mapSizeX / metersPerTile;
  canvas.height = mapSizeY / metersPerTile;

  let mapGeometry = new THREE.Group();

  let urls = [];
  let xPositions = [];
  let yPositions = [];

  for (let x = 0; x < tilesPerSideX + 1; x++)
  {
    for (let y = 0; y < tilesPerSideY + 1; y++)
    {
      urls.push(baseURL + (startTileX + x) + '&y=' + (startTileY + y) + '&z=' + overlay.zoom);
      xPositions.push((x * PX_PER_TILE) - pxOffsetX);
      yPositions.push((y * PX_PER_TILE) - pxOffsetY);
    }
  }

  try
  {
    urls.map((url, index) => fetch(new Request(url))
      .catch(error => console.log('Fetch Error =\n', error))
      .then(response => response.blob())
      .then(blob => setMap(
        URL.createObjectURL(blob),
        xPositions[index],
        yPositions[index],
        totalNumOfTiles,
        mapGeometry,
        overlay
      ))
    );
  }
  catch (e)
  {
    console.error(e);
  }
}

function setMap(url, canvasX, canvasY, totalNumOfTiles, mapGeometry, overlay)
{
  const img = new Image();
  img.onload = function()
  {
    const context = canvas.getContext('2d');
    context.drawImage(img,
      0, 0,                        // source x, source y (sx, sy)
      255, 255,                    // source width, source height (sWidth, sHeight)
      canvasX, canvasY,            // destination x, destination y (dx, dy)
      pixelsPerTile, pixelsPerTile // destination height (dWidth, dHeight)
    );

    if (++tilesLoaded == totalNumOfTiles)
    {
      const texture = new THREE.Texture(canvas);
      texture.minFilter = texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;

      var geometry = new THREE.PlaneBufferGeometry(overlay.size, size);
      var material = new THREE.MeshBasicMaterial(
      {
        map: texture,
        side: 2
      });

      var mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = -1.5;

      mapGeometry.add(mesh);
      overlay.geometry = mapGeometry;
      overlay.sceneAdd();
      console.log(overlay);
    }
  };
  img.src = url;
}

function lon2tile(longitude, zoom)
{
  return (longitude + 180) / 360 * Math.pow(2, zoom);
}

function lat2tile(latitude, zoom)
{
  return (1 - Math.log(Math.tan(latitude * pi / 180) + 1 / Math.cos(latitude * pi / 180)) / pi) / 2 * Math.pow(2, zoom);
}

function metersPerPixel(latitude, zoomLevel)
{
  return earthCircumference * Math.cos(latitude * (pi / 180)) / Math.pow(2, zoomLevel + 8);
}


module exports = {
  GoogleMapOverlay: googleMapOverlay
};