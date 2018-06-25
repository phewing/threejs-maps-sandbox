const v = function( x, y, z ){ return new THREE.Vector3( x, y, z ); };
const v2 = function( x, y ){ return new THREE.Vector2( x, y ); };

// TODO joel to investigate
//var js2xmlparser = require('js2xmlparser');

class SpeedBuilding extends speedBaseClass
{
  constructor(scene = undefined)
  {
    // No need to define the scene on the DSC engine

    super(scene)
  }


  checkinputs(properties)
  {
      // https://stackoverflow.com/questions/29356674/check-all-properties-of-object-for-undefined
      for (var property in properties) {
        if (properties.hasOwnProperty(property)) {
            if (properties[property] == undefined || properties[property] == null) {
                if (property != "area")
                { // Only allow the area property to be null - as this defines that only adjacentBuildings are allowed
                  throw property + "is undefined or null!!"
                }
            }
        }
    }
  }


  initalize(properties,windowProperties)
  {

    this.checkinputs(properties)
    this.checkinputs(windowProperties)

    this.length = properties.length
    this.width = properties.width
    this.thickness = properties.thickness
    this.numStoreys = properties.numStoreys
    this.storeyHeight = properties.storeyHeight
    this.perimeterDepth = properties.perimeterDepth
    this.footprint = properties.shape
    this.orientation = properties.orientation
    this.opacity = properties.opacity
    this.area = properties.area

    this.windowProperties = windowProperties

    this.colors = {

        InteriorWall: 0x008000,
        ExteriorWall: 0xFFB400,
        Roof: 0x800000,
        InteriorFloor: 0x80FFFF,
        ExposedFloor: 0x40B4FF,
        Shade: 0xFFCE9D,
        UndergroundWall: 0xA55200,
        UndergroundSlab: 0x804000,
        Ceiling: 0xFF8080,
        Air: 0xFFFF00,
        UndergroundCeiling: 0x408080,
        RaisedFloor: 0x4B417D,
        SlabOnGrade: 0x804000,
        FreestandingColumn: 0x808080,
        EmbeddedColumn: 0x80806E

      }

    this.materialParameters = { opacity: 0.8, side: 2, transparent: true };
    // Only add or remove from scene is scene is defined (so does nothing on DSC engine!)
    if (scene)
    {
      this.sceneRemove()

      // Need to add adjacent buildings as well
      this.scene.remove(this.adjbuildings)
    }

    if (this.area)
    {

      // Only construct geometry if area is null - if area is null it means that only adj buildings should be drawn
      this.constructGeometry()

      this.toggleEdges()

      // For checking
      this.getBuildingArea(this)
    }

    this.constructAdjBuildings()

    if (scene)
    {
      this.sceneAdd()
      // Need to add adjacent buildings as well
      this.scene.add(this.adjbuildings)
    }


  }

  constructGeometry()
  {

    this.geometry = new THREE.Group();
    this.geometry.name = "theBuilding"
    this.geometry.userData.openings = [];

      // Using choices in buildingShapes.js
      const choices = [ this.drawL, this.drawH, this.drawT, this.drawBox,this.drawU,this.drawP];
      //console.log(parseInt(this.footprint))
      const choice = choices[parseInt(this.footprint)];
      //console.log(buildingShapeEnumToNumber(parseInt(this.footprint)))

      var verticesOffset
      var vertices

      if (parseInt(this.footprint) < 6)
      { // For all shapes except courtyard
        vertices = choice(this.length,this.width,this.thickness);

        verticesOffset = offsetPoints( this.geometry, vertices, -this.perimeterDepth, 0 );
      }
      // Simply rotate the geometry - don't change the surface angle - TODO at 45 degree change N,S,E,W
      this.geometry.rotation.z = - this.orientation * Math.PI / 180;

      for ( var i = 0; i < this.numStoreys; i++ ) {

        const storey = new THREE.Group();

        storey.name = 'storey-' + ( i + 1 );

        const slabs = new THREE.Group();

        slabs.name = 'slabs';
        storey.add( slabs );

        if (parseInt(this.footprint) == 6)
        { // Only for courtyard shape
          // Inner perimeter
          // TODO solve
          const interiorWalls = new THREE.Group();
          interiorWalls.name = 'interior-walls';
          storey.add( interiorWalls );

          const interiorWallsDiagonal = new THREE.Group();
          interiorWallsDiagonal.name = 'interior-walls-diagonal';
          storey.add( interiorWallsDiagonal );

          const exteriorWalls = new THREE.Group();
          exteriorWalls.name = 'exterior-walls';
          storey.add( exteriorWalls );

          // Not used in gbxml export - purely for adding visually see lines 202 to 205 of gbxml export
          const ceilings = new THREE.Group();
          ceilings.name = "ceilings"
          storey.add( ceilings );

          if (2*this.perimeterDepth >= this.thickness)
          {
            throw "For courtyard 2 times perimeterDepth is greater than the thickness the geometry will not work!!"
          }

          let innerVertices = this.drawCY(this.length,this.width,this.thickness)[1]

          let innerOffsetVertices = offsetPoints( this.geometry, innerVertices,-this.perimeterDepth , 0 );

          // Inner perimeter
          drawPerimeterSlab( innerVertices, innerOffsetVertices, slabs,storey,this );

          drawExteriorWalls(this.windowProperties,this.storeyHeight ,innerVertices, exteriorWalls,this );

          drawInteriorWallsDiagonal( innerVertices, innerOffsetVertices, interiorWallsDiagonal,this );

          drawCeiling( innerVertices, innerOffsetVertices, ceilings,this );

          drawInteriorWalls( innerOffsetVertices, interiorWalls, this );

          // // Section between inner and outer perimeter
          //
          // Slab and walls in between outer and inner perimeter (No zones)

          //this.thickness+2*this.perimeterDepth
          // let val1 = this.thickness - 2*this.perimeterDepth
          // console.log(val1,"val1")
          // let offset2 = Math.sqrt(Math.pow(-val1,2)+Math.pow(-val1,2))

          let outerVertices = offsetPoints( this.geometry, innerOffsetVertices,-(this.thickness - 2*this.perimeterDepth), 0 )

          drawPerimeterSlab( innerOffsetVertices, outerVertices, slabs,storey,this );

          drawInteriorWalls( outerVertices, interiorWalls, this );

          drawCeiling( innerOffsetVertices, outerVertices, ceilings,this );

          // Outer perimeter
          let outerMostVertices = offsetPoints( this.geometry, outerVertices,-this.perimeterDepth, 0 )

          drawInteriorWallsDiagonal( outerMostVertices, outerVertices, interiorWallsDiagonal,this );

          let wallVertices = outerMostVertices.reverse()

          drawExteriorWalls(this.windowProperties,this.storeyHeight,outerMostVertices, exteriorWalls,this)

          // https://stackoverflow.com/questions/30610523/reverse-array-in-javascript-without-mutating-original-array Be careful to make a deep copy!

          let outerVerticesReverse = outerVertices.slice().reverse();

          drawPerimeterSlab( outerVerticesReverse, outerMostVertices , slabs,storey,this );

          drawCeiling( outerVerticesReverse, outerMostVertices,  ceilings,this );
        }
        else
        { // All other shapes except Countyard
          drawPerimeterSlab( vertices, verticesOffset, slabs,storey,this );

          drawSlab(verticesOffset,slabs,storey,this)

          const interiorWalls = new THREE.Group();
          interiorWalls.name = 'interior-walls';
          storey.add( interiorWalls );

          drawInteriorWalls( verticesOffset, interiorWalls, this );

          const interiorWallsDiagonal = new THREE.Group();
          interiorWallsDiagonal.name = 'interior-walls-diagonal';
          storey.add( interiorWallsDiagonal );

          drawInteriorWallsDiagonal( vertices, verticesOffset, interiorWallsDiagonal,this );

          const exteriorWalls = new THREE.Group();
          exteriorWalls.name = 'exterior-walls';
          storey.add( exteriorWalls );

          drawExteriorWalls(this.windowProperties,this.storeyHeight ,vertices, exteriorWalls,this );

          // Not used in gbxml export - purely for adding visually see lines 202 to 205 of gbxml export
          const ceilings = new THREE.Group();
          ceilings.name = "ceilings"

          drawCeiling( vertices, verticesOffset, ceilings,this );

          drawPerimeterCeiling(verticesOffset,ceilings,storey,this)

          storey.add( ceilings );
        }

        // Center the geometry
        storey.position.z = i * this.storeyHeight;
        storey.position.x = - this.length / 2;
        storey.position.y = - this.width / 2;

        this.geometry.add( storey );
      }

      this.addAngles(this.geometry);
    }

  // The possible building shapes
  drawBox(len,wid,thk) {

    const verticesBox = [ v( len, 0, 0 ), v( 0, 0, 0 ), v( 0, wid, 0 ), v( len, wid, 0 ), v( len, 0, 0 ) ];

    return verticesBox;
  }

  drawL(len,wid,thk) {

    const verticesL = [
      v( len, 0, 0 ),
      v( 0, 0, 0 ),
      v( 0, wid, 0 ),
      v( thk, wid, 0 ),
      v( thk, thk, 0 ),
      v( len, thk, 0 ),
      v( len, 0, 0 )
    ];

    return verticesL;
  }

  drawT(len,wid,thk) {

    const verticesT = [
      v( len, 0, 0 ),
      v( 0, 0, 0 ),
      v( 0, thk, 0 ),
      v( 0.5 * ( len - thk ), thk, 0 ),
      v( 0.5 * ( len - thk ), wid, 0 ),
      v( len - 0.5 * ( len - thk ), wid, 0 ),
      v( len - 0.5 * ( len - thk ), thk, 0 ),
      v( len, thk, 0 ),
      v( len, 0, 0 )
    ];

    return verticesT;
  }

  drawH(len,wid,thk) {

    const verticesH = [
      v( len - thk, 0.5 * ( wid - thk ), 0 ),
      v( thk, 0.5 * ( wid - thk ), 0 ),
      v( thk, 0, 0 ),
      v( 0, 0, 0 ),
      v( 0, wid, 0 ),
      v( thk, wid, 0 ),
      v( thk, wid - 0.5 * ( wid - thk ), 0 ),
      v( len - thk, wid - 0.5 * ( wid - thk ), 0 ),
      v( len - thk, wid, 0 ),
      v( len, wid, 0 ),
      v( len, 0, 0 ),
      v( len - thk, 0, 0 ),
      v( len - thk, 0.5 * ( wid - thk ), 0 )
    ];

    return verticesH;
  }

  drawU(len,wid,thk) {
    const verticesU = [
      v( 0, 0, 0 ),
      v( 0, wid, 0 ),
      v( thk, wid, 0 ),
      v( thk, thk, 0 ),
      v( len-thk, thk, 0 ),
      v(len- thk, wid, 0 ),
      v( len, wid, 0 ),
      v( len, 0, 0 ),
      v( 0, 0, 0 )
    ];
    return verticesU;
  }

  drawP(len,wid,thk) {
    const verticesP = [
      v( (len-thk)/2, 0, 0 ),
      v( (len-thk)/2, (wid-thk)/2, 0 ),
      v( 0, (wid-thk)/2, 0 ),
      v( 0, (wid+thk)/2, 0 ),
      v((len-thk)/2, (wid+thk)/2, 0 ),
      v( (len-thk)/2, wid, 0 ),
      v( (len+thk)/2, wid, 0 ),
      v( (len+thk)/2, (wid+thk)/2, 0 ),
      v( len, (wid+thk)/2, 0 ),
      v(len, (wid-thk)/2, 0 ),
      v( (len+thk)/2, (wid-thk)/2, 0 ),
      v( (len+thk)/2, 0, 0 ),
      v( (len-thk)/2, 0, 0 )
      // start
    ];
    return verticesP;
  }

  drawCY(len,wid,thk)
  {
    const verticesC_O = [
    v( 0, 0, 0 ),
    v(0, wid, 0 ),
    v( len, wid, 0 ),
    v( len, 0, 0 ),
     v( 0, 0, 0 )
    ];

    const verticesC_I = [
      v( thk, thk, 0 ),
      v( len-thk,thk, 0 ),
      v( len-thk, wid-thk, 0 ),
      v(thk, wid-thk, 0 ),
      v( thk, thk, 0 )
    ];

    return [verticesC_O,verticesC_I]
  }

  constructAdjBuildings()
  {
    this.adjbuildings = new THREE.Group();
    this.adjbuildings.name = "adjacentBuildings"

    for ( let i = 0; i < 4; i++ ) {

      const mesh = createMesh();
      mesh.name = 'adjbuilding' + ( i );
      mesh.scale.set( 20, 20, 30 ); // scale is easier to deal with than geometry vertices
      mesh.position.z = mesh.scale.z * 0.5;
      mesh.visible = false;

      this.adjbuildings.add(mesh)

    }
  }

  updateAdjBuilding(num,buildingDimensions) {

      const building = this.adjbuildings.children[num]; // is slice needed? check this

      // inpOffsetX
      building.position.x = parseInt( buildingDimensions[0], 10 );

      // inpOffsetY
      building.position.y = parseInt( buildingDimensions[1], 10 );

      // Length
      building.scale.x = parseInt( buildingDimensions[2], 10 );

      // Width
      building.scale.y = parseInt( buildingDimensions[3], 10 );

      // Height
      building.scale.z = parseInt( buildingDimensions[4], 10 );
      building.position.z = building.scale.z * 0.5;

      // inpSiteOrientation
      building.rotation.z = parseInt( buildingDimensions[5], 10 ) * - Math.PI / 180;

      /// Is the building visible?
      //building.visible = true
      building.visible = buildingDimensions[6]
  }

  toggleEdges() {

    const theBuilding = this.geometry

    // Build edges for theBuilding and SpaceLayout
    if ( !this.geometry.edges ) {
      this.geometry.traverse( function ( child ) {

        if ( child instanceof THREE.Mesh ) {

          const edgesGeometry = new THREE.EdgesGeometry( child.geometry );

          theBuilding.edges = new THREE.LineSegments( edgesGeometry, new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 4 } ) );
          theBuilding.edges.visible = true;
          theBuilding.edges.position.z = theBuilding.edges.position.z + 0.1;
          theBuilding.renderOrder = 1;
          child.add( theBuilding.edges );
        }
      } );
    }
  }

  addAngles(geometry) {
    // now all geometry created and in position, so read local data, transform to world
    geometry.updateMatrixWorld( true );

    geometry.traverse( function ( child ) {

      if ( child instanceof THREE.Mesh && !child.name.startsWith( 'slab' ) ) {

          let angle = Math.round( - child.getWorldRotation().z * 180 / Math.PI );

          angle = angle < 0 ? angle + 360 : angle;

          child.userData.angle = angle;

      }
    } );
  }

  getBuildingArea(theBuilding)
  {

    theBuilding.threejsArea = 0;

    const storeys = theBuilding.geometry.children;

    for ( let i = 0; i < storeys.length; i++ ) {

      const storey = storeys[ i ];
      const storeyCount = i + 1;
      theBuilding.storeyCount = storeyCount;
      // Get slabs they are the first element in the storey children\
      const slabs = storey.children[ 0 ];

      const slabsPerStory = slabs.children.length;
      theBuilding.slabsPerStory = slabsPerStory;

      for ( let j = 0; j < slabsPerStory; j++ ) {

        // Slab for this particular story
        const slab = slabs.children[ j ];

        const slabGeometry = new THREE.Geometry().fromBufferGeometry( slab.geometry );

        const area = THREE.ShapeUtils.area( slabGeometry.vertices.reverse() );
        theBuilding.threejsArea += area;
      }
    }

    console.log("The threejs calculated building area is",theBuilding.threejsArea)
  }

  exportGbxml(theBuilding)
  {
  	var json;
  	var gbxml;

  	var campus;
  	var buildings;

  	var vertAxis = new THREE.Vector3(0,0,1);
  	var negVertAxis = new THREE.Vector3(0,0,-1);

  	var divJson, divGbxml;

  	//console.log('gbxml export',this)
  	function getBuildingData (theBuilding) {
  		theBuilding.surfaceCount = 1;
  		theBuilding.spaceCount = 1;
  		theBuilding.openingCount = 1;
  		theBuilding.shadeCount = 1;
  		theBuilding.threejsArea = 0;

  		initExportGbxml(theBuilding);
  		getBuildingStoreys(theBuilding);
  		getSurfaces(theBuilding);
  		getAdjacentBuildings(theBuilding);
      exportGroundSurface(theBuilding);
  		//updateJson();

      function initExportGbxml(theBuilding) {

    		json = {

    			gbXML: {
    					"@xmlns": "http://www.gbxml.org/schema",
    					"@xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
    					"@xsi:schemaLocation": "http://www.gbxml.org/schema http://gbxml.org/schema/6-01/GreenBuildingXML_Ver6.01.xsd",
    					"@xmlns:xhtml": "http://www.w3.org/1999/xhtml",
    					"@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    					"@useSIUnitsForResults": "true",
    					"@SurfaceReferenceLocation": "Centerline",
    					"@temperatureUnit": "F",
    					"@lengthUnit": "Feet",
    					"@areaUnit": "SquareFeet",
    					"@volumeUnit": "CubicFeet",
    					"@version": "6.01",

    				Campus: {

    					"@id" : "Facility",
    					DaylightSavings: true,
    					Description: 'Generated by tools from www.Ladybug.Tools/Spider/',


    					Location: {
    						CADModelAzimuth: 0,
    						Elevation: 0,
    						Latitude: 37.796,
    						Longitude: -122.398,
    						Name: 'Financial District Redevelopment Area',
    						ZipcodeOrPostalCode: 94111
    					},

    					Building: {
    						"@id": 1,
    						"@buildingType": "Office",
    						Name: 'theBuilding ' + theBuilding.footprint + ' shape',
    						Area: 0,
    						BuildingStorey: [],
    						Space: []
    					},

    					Surface: [],

    				},
    				Zone: [],
    				DocumentHistory: []

    			}

    		}
    	}

      function getBuildingStoreys(theBuilding) {

        const storeys = json.gbXML.Campus.Building.BuildingStorey;

        for ( let i = 0; i < theBuilding.numStoreys; i++ ) {

          const storey = storeys[ i ];

          const obj = {

              "@id": "storey-" + ( i + 1 ),
              Name: "storey " + ( i + 1 ),
              Level: ( i * theBuilding.storeyHeight )

            }

          storeys.push( obj );

        }
      }

      function getSurfaces(theBuilding) {

        //console.log( 'storey', theBuilding.geometry.children[ 0 ] );
        //console.log("making surfaces");
        //console.log('json', json)
        const surfaces = json.gbXML.Campus.Surface;
        const spaces = json.gbXML.Campus.Building.Space;
        const zones = json.gbXML.Zone;
        const building = json.gbXML.Campus.Building;

        let surfaceCount = theBuilding.surfaceCount;
        let spaceCount; //  = theBuilding.spaceCount;
        let openingCount = theBuilding.openingCount;
        let shadeCount = theBuilding.shadeCount;
        // Get the Three js geometry for the export
        const storeys = theBuilding.geometry.children;

        for ( let i = 0; i < storeys.length; i++ ) {

          const storey = storeys[ i ];
          const storeyCount = i + 1;
          theBuilding.storeyCount = storeyCount;
          // Get slabs they are the first element in the storey children\
          const slabs = storey.children[ 0 ];

          const slabsPerStory = slabs.children.length;
          theBuilding.slabsPerStory = slabsPerStory;

          for ( let j = 0; j < slabsPerStory; j++ ) {

            // Slab for this particular story
            const slab = slabs.children[ j ];

            const slabGeometry = new THREE.Geometry().fromBufferGeometry( slab.geometry );

            const area = THREE.ShapeUtils.area( slabGeometry.vertices.reverse() );
            theBuilding.threejsArea += area;
            //console.log('the slab area: ', area);
            //console.log( 'area', theBuilding.threejsArea );
            //console.log( 'area', area.toLocaleString() );
            //console.log( 'volume', ( area * theBuilding.storeyHeight ).toLocaleString() );

            //decide whether to make ceiling or roof
            const type = storeyCount === theBuilding.geometry.children.length ? 'slabRoof' : 'slabCeiling';

            let surfaceSlab = getSlabType( type, storeyCount, surfaceCount, theBuilding.spaceCount,theBuilding );


            const ceiling = slab.clone();
            ceiling.geometry = slab.geometry.clone();
            ceiling.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, theBuilding.storeyHeight) );
            ceiling.geometry.verticesNeedUpdate = true;

            //console.log("Ceiling geometry", ceiling.geometry);

            getPolyLoop2( surfaceSlab, ceiling, true );

            surfaceCount ++;

            surfaces.push( surfaceSlab );

            //always create a slab if you are on level 1
            if ( storeyCount === 1 ) {

              let slabOnGrade = slab.clone();

              if ( j === slabsPerStory - 1 ) {

                slabOnGrade.geometry = slab.geometry.clone();
                slabOnGrade.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, 0 ) );
                slabOnGrade.geometry.verticesNeedUpdate = true;

              }

              surfaceSlab = getSlabType( 'slabOnGrade', storeyCount, surfaceCount, theBuilding.spaceCount,theBuilding );

              getPolyLoop2( surfaceSlab, slabOnGrade );

              surfaceCount ++;

              surfaces.push( surfaceSlab );

            }

            addSpaceAndZone( area,theBuilding );

          }

          // Get interior Walls they are the 2nd element in the storey children
          const interiorWalls = storey.children[ 1 ];

          spaceCount = i * slabsPerStory + 1;

          for ( let j = 0; j < interiorWalls.children.length; j++ ) {

            const interiorWall = interiorWalls.children[ j ];

            const surfaceInteriorWall = {

              "@surfaceType": "InteriorWall",
              "@id": "surface-" + surfaceCount,
              Name: 'storey-' + ( i + 1 ) + '-' + interiorWall.name + '-space-' + spaceCount,
              RectangularGeometry: {
                Azimuth: interiorWall.userData.angle
              },
              CADOjectId: "none",
              AdjacentSpaceId: [
                { "@spaceIdRef": "space-" + ( i * slabsPerStory + slabsPerStory ) },
                { "@spaceIdRef": "space-" + spaceCount },
              ],
              PlanarGeometry: {
                PolyLoop: []
              }

            };

            getPolyLoop2( surfaceInteriorWall, interiorWall );


            surfaces.push( surfaceInteriorWall );

            surfaceCount ++;
            spaceCount ++;

          }

          // Get interiorWallsDiagonal they are the 3rd element in the storey children
          const interiorWallsDiagonal = storey.children[ 2 ];

          spaceCount = i * slabsPerStory + 1;

          const len = interiorWallsDiagonal.children.length;

          for ( let j = 0; j < len ; j++ ) {

              const interiorDiagonalWall = interiorWallsDiagonal.children[ j ];

              const surfaceInteriorDiagonalWall = {

                "@surfaceType": "InteriorWall",
                "@id": "surface-" + surfaceCount,
                Name: 'storey-' + ( i + 1 ) + '-' + interiorDiagonalWall.name + '-space-' + spaceCount,
                RectangularGeometry: {
                  Azimuth: interiorDiagonalWall.userData.angle
                },
                CADOjectId: "none",
                AdjacentSpaceId: [
                  // If this is the first diagonal interior wall, it needs to be adjacent to the
                  // next-to-last space on the current floor (skip ahead no. of diagonal walls - 1).
                  // The last space on each floor is assumed to be the core space.
                  { "@spaceIdRef": "space-" + (j === 0 ? (spaceCount + len - 1) : (spaceCount - 1)) },
                  { "@spaceIdRef": "space-" + spaceCount }
                ],
                PlanarGeometry: {
                  PolyLoop: []
                }

              };

              getPolyLoop2( surfaceInteriorDiagonalWall, interiorDiagonalWall );

              surfaces.push( surfaceInteriorDiagonalWall );

              surfaceCount ++;
              spaceCount ++;

            }

          // Get exterior walls they are the 4th element in the storey children
          const exteriorWalls = storey.children[ 3 ];

          spaceCount = i * slabsPerStory + 1;

          for ( let j = 0; j < exteriorWalls.children.length; j++ ) {

            const exteriorWall = exteriorWalls.children[ j ];

            const surfaceExteriorWall = {

              "@surfaceType": "ExteriorWall",
              "@id": "surface-" + surfaceCount,
              Name: 'storey-' + ( i + 1 ) + '-' + exteriorWalls.children[ j ].name + '-space-' + spaceCount,
              RectangularGeometry: {
                Azimuth: exteriorWalls.children[ j ].userData.angle
              },
              CADOjectId: "none",
              AdjacentSpaceId: {
                "@spaceIdRef": "space-" + spaceCount
              },
              PlanarGeometry: {
                PolyLoop: []
              },
              Opening: []

            };

            getPolyLoop2( surfaceExteriorWall, exteriorWall );

            addOpenings( surfaceExteriorWall, exteriorWall,theBuilding );

            surfaces.push( surfaceExteriorWall );

            surfaceCount ++;

            addOverHangsFins( surfaces, exteriorWall , theBuilding );

            spaceCount ++;

          }

        }
      }

      function getAdjacentBuildings(theBuilding) {

        const surfaces = json.gbXML.Campus.Surface;
        // Get adjacent buildings from the scene
        let adjacentBuildings = theBuilding.adjbuildings

        // Loop through adjacent buildings
        for ( let child of adjacentBuildings.children ) {

          if (child.visible) {

            const geometry = new THREE.Geometry().fromBufferGeometry( child.geometry.clone() );

            let vertexCount = 0;

            for ( let i = 0; i < 5; i++ ) {
              // Replace returns a new string
              let gbxmlName = child.name.replace(/[0-9]/g, '');

              const surface = {
                "@surfaceType": "Shade",
                "@id": "shade-" + theBuilding.shadeCount,
                Name: gbxmlName,
                RectangularGeometry: {
                  Azimuth: 90 // child.userData.angle
                },
                PlanarGeometry: {
                  PolyLoop: []
                }
              };

              const v1 = child.localToWorld ( geometry.vertices[ vertexCount++ ] );
              const v2 = child.localToWorld ( geometry.vertices[ vertexCount++ ] );
              const v3 = child.localToWorld ( geometry.vertices[ vertexCount++ ] );
              const v4 = child.localToWorld ( geometry.vertices[ vertexCount++ ] );

              const vertices = [ v2, v1, v3, v4 ];

              for ( let j = 0; j < 4; j++ ) {

                const cartesianPoint = [];
                let vertex = vertices[ j ];

                const point = { CartesianPoint: [

                    { Coordinate: Number( vertex.x.toFixed( 4 ) ) },
                    { Coordinate: Number( vertex.y.toFixed( 4 ) ) },
                    { Coordinate: Number( vertex.z.toFixed( 4 ) ) }

                  ]

                };

                surface.PlanarGeometry.PolyLoop.push( point );
              }
              surfaces.push( surface );
              theBuilding.shadeCount ++;

            }

          }
        }
      }

      function addSpaceAndZone( area,theBuilding ) {

        const spaces = json.gbXML.Campus.Building.Space;
        const zones = json.gbXML.Zone;

        const space = {

          "@id": "space-" + theBuilding.spaceCount,
          "@zoneIdRef": "zone-" + theBuilding.spaceCount,
          "@buildingStoreyIdRef": 'storey-' + theBuilding.storeyCount,
          "@conditionType": "HeatedAndCooled",
          Name: 'storey-' + theBuilding.storeyCount + '-space-' + theBuilding.spaceCount,
          Description: "internal space " + theBuilding.spaceCount,
          Area: area,
          Volume: ( area * theBuilding.storeyHeight )

        };

        spaces.push( space );

        const zone = {

          "@id": "zone-" + theBuilding.spaceCount,
          Name: 'storey-' + theBuilding.storeyCount + '-zone-' + theBuilding.spaceCount

        };

        zones.push( zone );

        theBuilding.spaceCount ++;


      }

      function getSlabType( type, storey, surfaceCount, spaceCount, theBuilding ) {

        const slab = {

          slabOnGrade: {

            "@surfaceType": "SlabOnGrade",
            "@id": "surface-" + surfaceCount,
            Name: 'storey-' + storey + '-slabongrade-space-' + spaceCount,
            RectangularGeometry: {
              Azimuth: 90,
              Tilt : 180 //this is ok for now, but technically both should be calculated
            },
            CADOjectId: "none",
            AdjacentSpaceId: { "@spaceIdRef": "space-" + spaceCount },
            PlanarGeometry: {
              PolyLoop: []
            }

          },
          slabCeiling: {

            "@surfaceType": "Ceiling",
            "@id": "surface-" + theBuilding.surfaceCount,
            Name: 'storey-' + storey + '-ceiling-space-' + spaceCount,
            RectangularGeometry: {
              Azimuth: 90,
              Tilt : 0 //this is ok for now, but technically both should be calculated
            },
            CADOjectId: "none",
            AdjacentSpaceId: [
              { "@spaceIdRef": "space-" + spaceCount },
              { "@spaceIdRef": "space-" + ( spaceCount + theBuilding.slabsPerStory ) }
            ],
            PlanarGeometry: {
              PolyLoop: []
            }

          },
          slabRoof: {

            "@surfaceType": "Roof",
            "@id": "surface-" + surfaceCount,
            Name: 'storey-' + storey + '-roof-space-' + spaceCount,
            RectangularGeometry: {
              Azimuth: 90,
              Tilt:0 //this is ok for now, but technically both should be calculated
            },
            CADOjectId: "none",
            AdjacentSpaceId: { "@spaceIdRef": "space-" + spaceCount },
            PlanarGeometry: {
              PolyLoop: []
            }

          }
        };

        return slab[ type ];

      }



      function getPolyLoop2( surface, mesh, reverse=false ) {

        // this function works OK but creates too many CartesianPoint elements.
        // See checkGbxmlData below for temporary search and replace fix

        //console.log( 'surface', surface );
        //console.log( 'mesh', mesh );
        //console.log('making polyloop')
        const meshNewGeometry = new THREE.Geometry().fromBufferGeometry( mesh.geometry );
        const vertices = [];
        const len = mesh.name.startsWith( 'exterior-wall' ) ? 4 : meshNewGeometry.vertices.length;
        //console.log( mesh.name, len );

        for ( let k = 0; k < len; k++ ) {

          const vector = meshNewGeometry.vertices[ k ].clone();
          vertices.push( mesh.localToWorld( vector ) );

        }

        mesh.userData.verticesWorld = vertices;

        //console.log( 'vertices', vertices );

        if(!reverse)
        {
          const cartesianPoint = [];
          for ( let i = 0; i < vertices.length; i++ ) {

            let vertex = vertices[ i ];

            const point = { CartesianPoint: [

              { Coordinate: Number( vertex.x.toFixed( 4 ) ) },
              { Coordinate: Number( vertex.y.toFixed( 4 ) ) },
              { Coordinate: Number( vertex.z.toFixed( 4 ) ) }

            ] };
            //console.log('cartesian point', point);
            surface.PlanarGeometry.PolyLoop.push( point );

          }
        }
        else
        {
          //console.log("reversing polyloop coordinates");
          let reversed = vertices.reverse();

          //console.log(reversed)
          for ( let i = 0; i < reversed.length; i++ )
          {

            let vertex = reversed[ i ];

            const point = { CartesianPoint: [

              { Coordinate: Number( vertex.x.toFixed( 4 ) ) },
              { Coordinate: Number( vertex.y.toFixed( 4 ) ) },
              { Coordinate: Number( vertex.z.toFixed( 4 ) ) }

            ] };
            surface.PlanarGeometry.PolyLoop.push( point );

          }
        }


      }

      function addOpenings( surface, mesh ,theBuilding  ) {

        //console.log( 'wall', mesh );

        for ( var i = 0; i < mesh.userData.holes.length; i++ ) {

          let holes = mesh.userData.holes[ i ];
          //console.log('holes',holes);
          let opening = {
            "@openingType": "FixedWindow",
            "@id": "opening-" + theBuilding.openingCount,
            RectangularGeometry: {
              Azimuth: mesh.userData.angle
            },
            PlanarGeometry: {
              PolyLoop: []
            }
          };

          for ( let j = 0; j < 4; j++ ) {

            const vector = holes[ j ].clone();

            //console.log('holes',holes)

            const vertex = mesh.localToWorld( vector );
            //console.log("vertex",vertex);
            const point = { CartesianPoint: [

              { Coordinate: Number( vertex.x.toFixed( 4 ) ) },
              { Coordinate: Number( vertex.y.toFixed( 4 ) ) },
              { Coordinate: Number( vertex.z.toFixed( 4 ) ) }

            ] };

            opening.PlanarGeometry.PolyLoop.push( point );

          }

          surface.Opening.push( opening );

          theBuilding.openingCount ++;

        }

      }

      function addOverHangsFins( surfaces, mesh , theBuilding ) {

        //console.log( 'wall', mesh );

        mesh.traverse( function ( child ) {

          if ( child.name.startsWith( 'overhang-' ) || child.name.startsWith( 'fin-' ) ) {

            //console.log( 'child.name',child.name );
            // Name in gbxml should have no numbers or hypens
            let gbxmlName = child.name.split("-")[0]

            let surface = {
              "@surfaceType": "Shade",
              "@id": "shade-" + theBuilding.shadeCount,
              "Name": gbxmlName,
              "RectangularGeometry": {
                "Azimuth": mesh.userData.angle
              },
              "PlanarGeometry": {
                "PolyLoop": []
              }
            };

            getPolyLoop2( surface, child,true  );

            surfaces.push( surface );

            theBuilding.shadeCount ++;

          }

        } );
      }

      function exportGroundSurface()
      {
        const surfaces = json.gbXML.Campus.Surface;

        // Add ground plane for shading studies
        let groundLength = Math.sqrt(theBuilding.area*9.5)

        let groundSurface = {
          "@surfaceType": "Shade",
          "@id": "shade-" + theBuilding.shadeCount,
          "Name": "ground",
          "RectangularGeometry": {
            "Azimuth":0
          },
          "PlanarGeometry": {
            "PolyLoop": []
          }
        };

        //const vertices = [];

        var point1 = { CartesianPoint: [

          { Coordinate: Number( groundLength/2 ) },
          { Coordinate: Number( groundLength/2) },
          { Coordinate: Number( 0 ) }

        ] };

        groundSurface.PlanarGeometry.PolyLoop.push( point1 );

        var point2 = { CartesianPoint: [

          { Coordinate: Number( -groundLength/2) },
          { Coordinate: Number( groundLength/2 ) },
          { Coordinate: Number( 0 ) }

        ] };

        groundSurface.PlanarGeometry.PolyLoop.push( point2 );

        var point3 = { CartesianPoint: [

          { Coordinate: Number( -groundLength/2 ) },
          { Coordinate: Number( -groundLength/2) },
          { Coordinate: Number( 0 ) }

        ] };

        groundSurface.PlanarGeometry.PolyLoop.push( point3 );

        var point4 = { CartesianPoint: [

          { Coordinate: Number( groundLength/2 ) },
          { Coordinate: Number( -groundLength/2 ) },
          { Coordinate: Number( 0 ) }

        ] }

        groundSurface.PlanarGeometry.PolyLoop.push( point4 );

        surfaces.push(groundSurface)

      }

  	}

  	function checkGbxmlData()
  	{

  		if ( !json ){ alert( 'get building data first' ); return; }
  		gbxml = createXML ( json )
      // TODO Joel to investigate
      //gbxml = js2xmlparser.parse( json )
  		//console.log("gbxml: ", gbxml)

  		var xmlText = new XMLSerializer().serializeToString( gbxml );

  		// the kludge to get around getPolyLoop fail

  		var repre = /\<\/CartesianPoint>\<CartesianPoint>/gi;
  		var mods = xmlText.replace( repre, '' )

  		var repre2 = /\<\/PolyLoop>\<PolyLoop>/gi;
  		var mods2 = mods.replace( repre2, '' )
  		let formatted = formatXml(mods2);

  		var inner_id = 'txtGbxml';
  		//openInspectorWindow(bindToInspectorWindow, inner_id, formatted);

  	}

  	function saveFile() {

  		if( !gbxml ) { alert( 'Get some building data first.' ); return; }

  		let blob;
  		var xmlText = new XMLSerializer().serializeToString( gbxml );
  				// the kludge to get around getPolyLoop fail
  		var repre = /<\/CartesianPoint>\<CartesianPoint>/g
  		var mods = xmlText.replace(repre,'')

  		var repre2 = /<\/PolyLoop>\<PolyLoop>/g
  		var mods2 = mods.replace(repre2,'');
  		xmlText = formatXml(mods2);

  		blob = new Blob( [ xmlText ],{ type: 'text/xml' } );

  		let a = document.body.appendChild( document.createElement( 'a' ) );
  		a.href = window.URL.createObjectURL( blob );
      // TODO Set building file name here

      let buildingType = buildingShapeEnumToNumber(theBuilding.footprint).toLowerCase()
  		const fileName = buildingType + '-' + (Math.round(theBuilding.threejsArea* 10 ) / 10).toString() + ' area-' + theBuilding.numStoreys.toString() + 'flr-' + theBuilding.orientation.toString() + 'deg' + '.xml';
  		a.download = fileName;

  		a.click();

  		//		delete a;
  		a = null;

  		if ( window.checkWindow !== undefined ) { window.checkWindow.close(); }

  	}


    /////////////////
    //https://developer.mozilla.org/en-US/docs/Archive/JXON#Reverse_Algorithms
  	function createXML ( oObjTree ) {

  		function loadObjTree (oParentEl, oParentObj) {

  			var vValue, oChild;

  			if ( oParentObj.constructor === String || oParentObj.constructor === Number || oParentObj.constructor === Boolean ) {

  				oParentEl.appendChild(oNewDoc.createTextNode(oParentObj.toString())); /* verbosity level is 0 or 1 */

  				if ( oParentObj === oParentObj.valueOf()) { return; }

  			} else if ( oParentObj.constructor === Date) {

  				oParentEl.appendChild(oNewDoc.createTextNode(oParentObj.toGMTString()));

  			}

  			for ( var sName in oParentObj ) {

  			if ( isFinite(sName)) { continue; } /* verbosity level is 0 */

  				vValue = oParentObj[sName];

  				if ( sName === "keyValue") {

  					if ( vValue !== null && vValue !== true) {

  						oParentEl.appendChild(oNewDoc.createTextNode(vValue.constructor === Date ? vValue.toGMTString() : String(vValue)));

  					}

  				} else if ( sName === "keyAttributes") { /* verbosity level is 3 */

  					for ( var sAttrib in vValue) { oParentEl.setAttribute(sAttrib, vValue[sAttrib]); }

  				} else if ( sName.charAt(0) === "@") {

  					oParentEl.setAttribute(sName.slice(1), vValue);

  				} else if ( vValue.constructor === Array ) {

  					for ( var nItem = 0; nItem < vValue.length; nItem++ ) {

  						oChild = oNewDoc.createElement(sName );
  						loadObjTree(oChild, vValue[nItem]);
  						oParentEl.appendChild(oChild);

  					}

  				} else {

  					oChild = oNewDoc.createElement(sName);

  					if ( vValue instanceof Object ) {

  						loadObjTree( oChild, vValue);

  					} else if ( vValue !== null && vValue !== true ) {

  						oChild.appendChild(oNewDoc.createTextNode( vValue.toString() ) );
  						//						oChild.innerHTML += oNewDoc.createTextNode( vValue.toString());

  					}

  					oParentEl.appendChild( oChild);

  				}

  			}

  		}

  		const oNewDoc = document.implementation.createDocument( "", "", null);

  		loadObjTree( oNewDoc, oObjTree );

  		return oNewDoc;

  	}

  		function formatXml(xml) {
  			var formatted = '';
  			var reg = /(>)(<)(\/*)/g;
  			xml = xml.replace(reg, '$1\r\n$2$3');
  			var pad = 0;

        xml.split('\r\n').forEach(function(node, index) {
            var indent = 0;
            if (node.match( /.+<\/\w[^>]*>$/ )) {
                indent = 0;
            } else if (node.match( /^<\/\w/ )) {
                if (pad != 0) {
                    pad -= 1;
                }
            } else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
                indent = 1;
            } else {
                indent = 0;
            }

            var padding = '';
            for (var i = 0; i < pad; i++) {
                padding += '  ';
            }

            formatted += padding + node + '\r\n';
            pad += indent;
        });

  			return formatted;
  		}

    	getBuildingData(theBuilding)

    	checkGbxmlData()

    	saveFile()

    	return gbxml
  }

  exportRad(theBuilding, includeMaterials=true, includeSlabOnGrade=false, includeCeilings=false)
  {
    var json;
  	var rad;

  	var campus;
    var buildings;
    
    var scaleFactor = theBuilding.isSI ? 1.0 : 0.3048;

  	var vertAxis = new THREE.Vector3(0, 0, 1);
  	var negVertAxis = new THREE.Vector3(0, 0, -1);

  	var divJson, divRad;

    function getBuildingData(theBuilding)
    {
  		theBuilding.surfaceCount = 1;
  		theBuilding.spaceCount = 1;
  		theBuilding.openingCount = 1;
  		theBuilding.shadeCount = 1;
  		theBuilding.threejsArea = 0;

  		initExportRad(theBuilding);
  		getBuildingStoreys(theBuilding);
  		getSurfaces(theBuilding);
  		getAdjacentBuildings(theBuilding);
      exportGroundSurface(theBuilding);

      function initExportRad(theBuilding)
      {
        json = {
    			rad: {
            meta: {
              location: {
                elevation: 0,
    						latitude: 0.0000,
    						longitude: 0.0000,
    						name: null,
    						zipcodeOrPostalCode: null
              },
    					lengthUnit: "Meters",
    					areaUnit: "SquareMeters",
              volumeUnit: "CubicMeters",
              building: {
                id: 1,
                type: "Office",
                name: 'theBuilding ' + theBuilding.footprint + ' shape',
                buildingStoreys: []
              }
            },
            surfaces: [],
    		  }
        };
      }

      function getBuildingStoreys(theBuilding)
      {
        const storeys = json.rad.meta.building.buildingStoreys;
        for (let i = 0; i < theBuilding.numStoreys; i++)
        {
          const storey = storeys[i];
          const obj = {
            id: "storey-" + (i + 1),
            name: "storey " + (i + 1),
            level: (i * theBuilding.storeyHeight * scaleFactor)
          }
          storeys.push(obj);
        }
      }

      function getSurfaces(theBuilding)
      {
        const surfaces = json.rad.surfaces;
        let surfaceCount = theBuilding.surfaceCount;
        let spaceCount = theBuilding.spaceCount;
        let openingCount = theBuilding.openingCount;
        let shadeCount = theBuilding.shadeCount;

        const storeys = theBuilding.geometry.children;

        for (let i = 0; i < storeys.length; i++)
        {
          const storey = storeys[i];
          const storeyCount = i + 1;
          theBuilding.storeyCount = storeyCount;

          ///////////////////////////////////////////////////////////////////////////
          // Get slabs; they are the first ([0]) element in the building children. //
          ///////////////////////////////////////////////////////////////////////////
          
          const slabs = storey.children[0];
          const slabsPerStory = slabs.children.length;
          theBuilding.slabsPerStory = slabsPerStory;

          for (let j = 0; j < slabsPerStory; j++)
          {
            // Loop through and add slabs.

            const slab = slabs.children[j];
            const slabGeometry = new THREE.Geometry().fromBufferGeometry(slab.geometry);

            const area = THREE.ShapeUtils.area(slabGeometry.vertices.reverse());

            // Don't forget to apply IP/SI conversion factor for area!
            theBuilding.threejsArea += area * Math.pow(scaleFactor, 2);

            // Decide whether to make ceiling or roof.
            const type = storeyCount === theBuilding.geometry.children.length ? 'slabRoof' : 'slabCeiling';
            let surfaceSlab = getSlabType2(type, storeyCount, surfaceCount, theBuilding.spaceCount, theBuilding);

            const ceiling = slab.clone();
            ceiling.geometry = slab.geometry.clone();
            ceiling.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, theBuilding.storeyHeight));
            ceiling.geometry.verticesNeedUpdate = true;

            // IP/SI conversion happens inside getPolyLoop2(...).
            getPolyLoop2(surfaceSlab, ceiling, true);
            surfaceCount++;
            surfaces.push(surfaceSlab);

            // Always create a slab if you are on Level 1.
            if (storeyCount === 1)
            {
              let slabOnGrade = slab.clone();
              if (j === slabsPerStory - 1)
              {
                slabOnGrade.geometry = slab.geometry.clone();
                slabOnGrade.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, 0));
                slabOnGrade.geometry.verticesNeedUpdate = true;
              }

              surfaceSlab = getSlabType2('slabOnGrade', storeyCount, surfaceCount, theBuilding.spaceCount, theBuilding);
              getPolyLoop2(surfaceSlab, slabOnGrade);
              surfaceCount++;
              surfaces.push(surfaceSlab);
            }
          }

          /////////////////////////////////////////////////////////////////////////////////////
          // Get exterior walls; they are the fourth ([3]) element in the building children. //
          /////////////////////////////////////////////////////////////////////////////////////
          
          const exteriorWalls = storey.children[3];
          spaceCount = i * slabsPerStory + 1;

          for (let j = 0; j < exteriorWalls.children.length; j++)
          {
            // Loop through and add.

            const exteriorWall = exteriorWalls.children[j];
            const surfaceExteriorWall = {
              id: "surface-" + surfaceCount,
              type: "ExteriorWall",
              name: 'storey-' + (i + 1) + '-' + exteriorWall.name + '-space-' + spaceCount,
              polyloop: [],
              openings: []
            };

            getPolyLoop2(surfaceExteriorWall, exteriorWall);
            addOpenings(surfaceExteriorWall, exteriorWall, theBuilding);
            surfaces.push(surfaceExteriorWall);
            surfaceCount++;

            addOverHangsFins(surfaces, exteriorWall, theBuilding);
            spaceCount++;
          }
        }
      }

      function getSlabType2(type, storey, surfaceCount, spaceCount, theBuilding)
      {
        const slab = {
          slabOnGrade: {
            id: "surface-" + surfaceCount,
            type: "SlabOnGrade",
            name: 'storey-' + storey + '-slabongrade-space-' + spaceCount,
            polyloop: []
          },
          slabCeiling: {
            id: "surface-" + surfaceCount,
            type: "Ceiling",
            name: 'storey-' + storey + '-ceiling-space-' + spaceCount,
            polyloop: []
          },
          slabRoof: {
            id: "surface-" + surfaceCount,
            type: "Roof",
            name: 'storey-' + storey + '-roof-space-' + spaceCount,
            polyloop: []
          }
        };
        return slab[type];
      }

      function getFullSlab(theBuilding)
      {
      }

      function getPolyLoop2(surface, mesh, reverse=false)
      {
        const meshNewGeometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
        const vertices = [];
        const len = mesh.name.startsWith('exterior-wall') ? 4 : meshNewGeometry.vertices.length;

        for (let k = 0; k < len; k++)
        {
          const vector = meshNewGeometry.vertices[k].clone();
          vertices.push(mesh.localToWorld(vector));
        }

        mesh.userData.verticesWorld = vertices;

        if(!reverse)
        {
          for (let i = 0; i < vertices.length; i++)
          {
            let vertex = vertices[i];

            // Don't forget to scale!
            const point = [
              Number(vertex.x.toFixed(4)) * scaleFactor,
              Number(vertex.y.toFixed(4)) * scaleFactor,
              Number(vertex.z.toFixed(4)) * scaleFactor
            ];
            surface.polyloop.push(point);
          }
        }
        else
        {
          let reversed = vertices.reverse();
          for (let i = 0; i < reversed.length; i++)
          {
            let vertex = reversed[i];
            
            // Don't forget to scale!
            const point = [
              Number((vertex.x * scaleFactor).toFixed(4)),
              Number((vertex.y * scaleFactor).toFixed(4)),
              Number((vertex.z * scaleFactor).toFixed(4))
            ];
            surface.polyloop.push(point);
          }
        }
      }

      function addOpenings(surface, mesh, theBuilding)
      {
        for (let i = 0; i < mesh.userData.holes.length; i++)
        {

          let holes = mesh.userData.holes[i];
          let opening = {
            id: "opening-" + theBuilding.openingCount,
            type: "FixedWindow",
            name: "opening " + theBuilding.openingCount,
            polyloop: []
          };

          for (let j = 0; j < 4; j++)
          {
            const vector = holes[j].clone();
            const vertex = mesh.localToWorld(vector);
            
            // Don't forget to scale!
            const point = [
              Number((vertex.x * scaleFactor).toFixed(4)),
              Number((vertex.y * scaleFactor).toFixed(4)),
              Number((vertex.z * scaleFactor).toFixed(4))
            ];
            opening.polyloop.push(point);
          }
          surface.openings.push(opening);
          theBuilding.openingCount++;
        }

        surface.polyloop = convertWallOpenings(surface);
      }

      function addOverHangsFins(surfaces, mesh, theBuilding)
      {
        mesh.traverse(function(child)
        {
          if ( child.name.startsWith('overhang-') || child.name.startsWith('fin-'))
          {
            let radName = child.name.split("-")[0];
            let surface = {
              id: "shade-" + theBuilding.shadeCount,
              type: "Shade",
              name: radName,
              polyloop: []
            };
            getPolyLoop2(surface, child, true);
            surfaces.push(surface);
            theBuilding.shadeCount++;
          }
        });
      }

      function getAdjacentBuildings(theBuilding)
      {
        const surfaces = json.rad.surfaces;

        // Get adjacent buildings from the scene
        let adjacentBuildings = theBuilding.adjbuildings

        // Loop through adjacent buildings
        for (let child of adjacentBuildings.children)
        {
          if (child.visible)
          {
            const geometry = new THREE.Geometry().fromBufferGeometry(child.geometry.clone());
            let vertexCount = 0;

            for (let i = 0; i < 5; i++)
            {
              let radName = child.name.replace(/[0-9]/g, '');

              const surface = {
                id: "shade-" + theBuilding.shadeCount,
                type: "Shade",
                name: radName,
                polyloop: []
              };

              const v1 = child.localToWorld(geometry.vertices[vertexCount++]);
              const v2 = child.localToWorld(geometry.vertices[vertexCount++]);
              const v3 = child.localToWorld(geometry.vertices[vertexCount++]);
              const v4 = child.localToWorld(geometry.vertices[vertexCount++]);
              const vertices = [v2, v1, v3, v4];

              for (let j = 0; j < 4; j++)
              {
                let vertex = vertices[j];

                // Don't forget to scale!
                const point = [
                  Number((vertex.x * scaleFactor).toFixed(4)),
                  Number((vertex.y * scaleFactor).toFixed(4)),
                  Number((vertex.z * scaleFactor).toFixed(4))
                ];
                surface.polyloop.push(point);
              }
              surfaces.push(surface);
              theBuilding.shadeCount++;
            }
          }
        }
      }

      function exportGroundSurface()
      {
        const surfaces = json.rad.surfaces;

        let groundLength = Math.sqrt(theBuilding.area * 9.5);

        let groundSurface = {
          id: "shade-" + theBuilding.shadeCount,
          type: "Shade",
          name: "ground",
          polyloop: []
        };

        var point1 = [
          Number(groundLength/2) * scaleFactor,
          Number(groundLength/2) * scaleFactor,
          Number(0)
        ];
        groundSurface.polyloop.push(point1);

        var point2 = [
          Number(-groundLength/2) * scaleFactor,
          Number(groundLength/2) * scaleFactor,
          Number(0)
        ];
        groundSurface.polyloop.push(point2);

        var point3 = [
          Number(-groundLength/2) * scaleFactor,
          Number(-groundLength/2) * scaleFactor,
          Number(0)
        ];
        groundSurface.polyloop.push(point3);

        var point4 = [
          Number(groundLength/2) * scaleFactor,
          Number(-groundLength/2) * scaleFactor,
          Number(0)
        ];
        groundSurface.polyloop.push(point4);

        surfaces.push(groundSurface);
      }
    }

    function convertWallOpenings(radWall)
    {
      var vertices = [];

      // Add the wall vertices first.
      for (let i = 0; i < radWall.polyloop.length; i++)
      { vertices.push(radWall.polyloop[i]) }

      if (radWall.openings !== [])
      {
        // A temporary variable to make manipulation easier.
        var wallOpenings = radWall.openings;

        // Check first to make sure that opening sequence isn't reversed relative to wall's first vertex.
        if (!areOpeningsReversed(radWall.polyloop[0], wallOpenings))
        {
          wallOpenings = wallOpenings.reverse();
        }

        // Also loop through and make sure that the first vertex in each opening polyloop is the closest to the wall's first vertex.
        for (let i = 0; i < wallOpenings.length; i++)
        {
          // Don't forget to reverse the vertices first; we need to go through vertices for openings in reverse (clockwise) order!
          wallOpenings[i].polyloop.reverse();

          let rotateCount = getClosestPointByIdx(radWall.polyloop[0], wallOpenings[i].polyloop) + 1;

          // If necessary, rotate the list of vertices for the opening.
          if (rotateCount !== 0)
          {
            while (rotateCount--)
            {
              wallOpenings[i].polyloop.push(wallOpenings[i].polyloop.shift());
            }
          }
        }

        // If there are openings specified for the wall, come back to the first vertex.
        vertices.push(radWall.polyloop[0]);

        // Loop through all the openings available.
        for (let i = 0; i < wallOpenings.length; i++)
        {
          // Add the polyloop points for each opening in reverse (clockwise) order.

          for (let j = 0; j < 4; j++)
          {
            vertices.push(wallOpenings[i].polyloop[j]);
          }

          // Come back to the first vertex of the wall before drawing another opening.
          vertices.push(wallOpenings[i].polyloop[0]);
          vertices.push(radWall.polyloop[0]);
        }
      }

      radWall.polyloop = vertices;
      return vertices;
    }

    function getDistance(point1, point2)
    {
      return Math.sqrt(
        Math.pow(point1[0] + point2[0], 2) +
        Math.pow(point1[1] + point2[1], 2) +
        Math.pow(point1[2] + point2[2], 2)
      );
    }

    function getAreaCentroid(points)
    {
      let numPoints = points.length;
      let xAverage = 0;
      let yAverage = 0;
      let zAverage = 0;
      for (let i = 0; i < numPoints; i++)
      {
        xAverage += points[i][0] / numPoints;
        yAverage += points[i][1] / numPoints;
        zAverage += points[i][2] / numPoints;
      }
      return [xAverage, yAverage, zAverage];
    }

    function getClosestPointByIdx(refPoint, testPoints)
    {
      let distance;
      let index = -1;
      let closestDistance = Number.MAX_SAFE_INTEGER;
      
      for (let i = 0; i < testPoints.length; i++)
      {
        distance = getDistance(refPoint, testPoints[i]);
        if (i < closestDistance)
        {
          closestDistance = distance;
          index = i;
        }
      }
      return index;
    }

    function areOpeningsReversed(refPoint, openings)
    {
      let firstOpeningDistance = getDistance(refPoint, getAreaCentroid(openings[0].polyloop));
      let lastOpeningDistance  = getDistance(refPoint, getAreaCentroid(openings[openings.length - 1].polyloop));
      if (firstOpeningDistance > lastOpeningDistance)
      { return true; }
      else
      { return false; }
    }

    function prepareRadData(materials=includeMaterials, slabs=includeSlabOnGrade, ceilings=includeCeilings)
    {
      if (!json)
      {
        alert("Get some building data first.");
        return;
      }

      let radData;

      if (materials)
      {
        radData = [
          "void plastic grey_0.25\n",
          "0\n",
          "0\n",
          "5 0.4800 0.5333 0.3033 0 0\n",
          "\n\n",

          "void plastic grey_0.6\n",
          "0\n",
          "0\n",
          "5 0.8500 0.7600 0.6033 0 0",
          "\n\n",
          
          "void plastic grey_0.7\n",
          "0\n",
          "0\n",
          "5 0.5800 0.6633 0.7467 0 0\n",
          "\n\n",

          "void glass glass_0.5\n",
          "0\n",
          "0\n",
          "3 0.3333 0.4967 0.7900\n",
          "\n\n"
        ];
      }
      else
      {
        radData = [];
      }

      let radSurfaces = json.rad.surfaces;

      for (let i = 0; i < radSurfaces.length; i++)
      {
        // Roof, ceiling, or slab-on-grade
        if (
          (radSurfaces[i].type === "Roof") ||
          (radSurfaces[i].type === "Ceiling" && ceilings) ||
          (radSurfaces[i].type === "SlabOnGrade" && slabs)
        )
        {
          radData.push("grey_0.6 polygon " + radSurfaces[i].type + '.' + radSurfaces[i].id + "\n");
          radData.push("0\n", "0\n");

          let numVertexArgs = radSurfaces[i].polyloop.length * 3;
          let vertexArgs = [numVertexArgs];

          for (let j = 0; j < numVertexArgs / 3; j++)
          {
            vertexArgs.push("\t" + radSurfaces[i].polyloop[j][0] + " " + radSurfaces[i].polyloop[j][1] + " " + radSurfaces[i].polyloop[j][2]);
          }

          radData.push(vertexArgs.join("\n"));
          radData.push("\n", "\n");
        }

        // Exterior walls
        else if (radSurfaces[i].type === "ExteriorWall")
        {
          radData.push("grey_0.6 polygon " + radSurfaces[i].type + '.' + radSurfaces[i].id + "\n");
          radData.push("0\n", "0\n");

          let numVertexArgs = radSurfaces[i].polyloop.length * 3;
          let vertexArgs = [numVertexArgs];

          for (let v = 0; v < numVertexArgs / 3; v++)
          {
            vertexArgs.push("\t" + radSurfaces[i].polyloop[v][0] + " " + radSurfaces[i].polyloop[v][1] + " " + radSurfaces[i].polyloop[v][2]);
          }

          radData.push(vertexArgs.join("\n"));
          radData.push("\n", "\n");

          // Wall openings
          if (radSurfaces[i].openings !== [])
          {
            for (let j = 0; j < radSurfaces[i].openings.length; j++)
            {
              radData.push("glass_0.5 polygon " + radSurfaces[i].openings[j].type + '.' + radSurfaces[i].openings[j].id + "\n");
              radData.push("0\n", "0\n");

              let numOpeningVtxArgs = radSurfaces[i].openings[j].polyloop.length * 3;
              let openingVtxArgs = [numOpeningVtxArgs];

              for (let k = 0; k < numOpeningVtxArgs / 3; k++)
              {
                openingVtxArgs.push("\t" + radSurfaces[i].openings[j].polyloop[k][0] +
                                    " "  + radSurfaces[i].openings[j].polyloop[k][1] +
                                    " "  + radSurfaces[i].openings[j].polyloop[k][2]);
              }
              radData.push(openingVtxArgs.join("\n"));
              radData.push("\n", "\n");
            }
          }
        }

        // Overhangs, fins, adjacent buildings, and ground plane
        else if (radSurfaces[i].type === "Shade")
        {

          if (radSurfaces[i].name.startsWith("adjbuilding"))
          {
            radData.push("grey_0.7 polygon " + radSurfaces[i].type + '.' + radSurfaces[i].id + "." + radSurfaces[i].name + "\n");
          }
          else if (radSurfaces[i].name === "ground")
          {
            radData.push("grey_0.25 polygon " + radSurfaces[i].type + '.' + radSurfaces[i].id + "." + radSurfaces[i].name + "\n");
          }
          else
          {
            radData.push("grey_0.7 polygon " + radSurfaces[i].type + '.' + radSurfaces[i].id + "." + radSurfaces[i].name + "\n");
          }

          radData.push("0\n", "0\n");

          var numVertexArgs = radSurfaces[i].polyloop.length * 3;
          var vertexArgs = [numVertexArgs];

          for (let v = 0; v < numVertexArgs / 3; v++)
          {
            vertexArgs.push("\t" + radSurfaces[i].polyloop[v][0] + " " + radSurfaces[i].polyloop[v][1] + " " + radSurfaces[i].polyloop[v][2]);
          }

          radData.push(vertexArgs.join("\n"));
          radData.push("\n", "\n");
        }
      }
      rad = radData.join("");
    }

    function saveRadFile()
    {
      if (!rad)
      {
        alert("Get some building data first.");
        return;
      }

      let blob = new Blob([rad], {type: 'text/plain'});
      let a = document.body.appendChild(document.createElement('a'));
      a.href = window.URL.createObjectURL(blob);

      let buildingType = buildingShapeEnumToNumber(theBuilding.footprint).toLowerCase();
      const fileName = 'speedsolar.rad';
      a.download = fileName;
      a.click();
      a = null;

      if (window.checkWindow !== undefined) { window.checkWindow.close(); }
    }

    getBuildingData(theBuilding);
    prepareRadData();
    saveRadFile();
  }
}

function drawPerimeterSlab( vertices1, vertices2, obj,storey,theBuilding,colors) {

  // const material = new THREE.MeshPhongMaterial();
  theBuilding.materialParameters.color = theBuilding.colors.InteriorFloor
  //materialParameters.color = 0xffffff * Math.random();
  theBuilding.materialParameters.opacity = theBuilding.opacity;

  const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

  for ( var i = 0; i < vertices1.length - 1 ; i++ ) {

    const verticesShape = [

      vertices1[ i ],
      vertices2[ i ],
      vertices2[ i + 1 ],
      vertices1[ i + 1 ]

    ];

    const shape = new THREE.Shape( verticesShape );
    const geometryShape = new THREE.ShapeBufferGeometry( shape );

    const meshShape = new THREE.Mesh( geometryShape, material );

    meshShape.name = storey.name + '-slab-' + ( i + 2 );

    meshShape.userData.angle = 90 + theBuilding.orientation;
    meshShape.userData.verticesLocal = verticesShape;
    obj.add( meshShape );

  }
}

function drawSlab(verticesOffset,obj,storey,theBuilding)
{

  const shapeOffset = new THREE.Shape( verticesOffset );
  const geometryShapeOffset = new THREE.ShapeBufferGeometry( shapeOffset );

  theBuilding.materialParameters.color = theBuilding.colors.InteriorFloor
  theBuilding.materialParameters.opacity = theBuilding.opacity;

  const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

  // const material = new THREE.MeshPhongMaterial();
  // material.color = colors.InteriorFloor

  const meshSlab = new THREE.Mesh( geometryShapeOffset, material );
  meshSlab.name = storey.name + '-slab-1-interior';
  meshSlab.userData.angle = 90 + theBuilding.orientation;
  meshSlab.userData.verticesLocal = verticesOffset;

  obj.add( meshSlab );
}


function drawCeiling( vertices1, vertices2, obj,theBuilding ) {

  // Use Exterior wall color
  theBuilding.materialParameters.color = theBuilding.colors.Ceiling
  theBuilding.materialParameters.opacity = theBuilding.opacity;

  const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

  for ( var i = 0; i < vertices1.length - 1 ; i++ ) {

    const verticesShape = [

      vertices1[ i ],
      vertices2[ i ],
      vertices2[ i + 1 ],
      vertices1[ i + 1 ]

    ];

    const shape = new THREE.Shape( verticesShape );
    const geometryShape = new THREE.ShapeBufferGeometry( shape );

    const meshShape = new THREE.Mesh( geometryShape, material );
    meshShape.name = obj.name + '-ceiling-' + ( i + 2 );
    meshShape.userData.angle = 90 + this.orientation;
    meshShape.userData.verticesLocal = verticesShape;

    meshShape.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, theBuilding.storeyHeight) );
    meshShape.geometry.verticesNeedUpdate = true;



    obj.add( meshShape );

  }
}

function drawPerimeterCeiling(verticesOffset,obj,storey, theBuilding)
{
  const shapeOffset = new THREE.Shape( verticesOffset );
  const geometryShapeOffset = new THREE.ShapeBufferGeometry( shapeOffset );

  theBuilding.materialParameters.color = theBuilding.colors.Ceiling;
  theBuilding.materialParameters.opacity = theBuilding.opacity;
  const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

  const meshSlab = new THREE.Mesh( geometryShapeOffset, material );
  meshSlab.name = storey.name + '-ceiling-1-interior';
  meshSlab.userData.angle = 90 + theBuilding.orientation;
  meshSlab.userData.verticesLocal = verticesOffset;

  meshSlab.geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 0, theBuilding.storeyHeight) );
  meshSlab.geometry.verticesNeedUpdate = true;

  obj.add( meshSlab );
}


function drawInteriorWalls( vertices, obj ,theBuilding ) {

  theBuilding.materialParameters.color = theBuilding.colors.InteriorWall;
  theBuilding.materialParameters.opacity = theBuilding.opacity;
  const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

  for ( let i = 0; i < vertices.length - 1; i++ ) {

    const vertex = vertices[ i ];
    const vertexNext = i < vertices.length - 1 ? vertices[ i + 1 ] : vertices[ 0 ];
    const angleVector = vertexNext.clone().sub( vertex ).normalize();
    const angleRadians = Math.atan2( angleVector.y, angleVector.x );

    const length = vertex.distanceTo( vertexNext );
    //console.log(length)
    //console.log(theBuilding.storeyHeight)
    const verticesShape = [ v2( 0, 0 ), v2( length, 0 ), v2( length, theBuilding.storeyHeight ), v2( 0, theBuilding.storeyHeight ) ];

    const shape = new THREE.Shape( verticesShape );

    const geometryShape = new THREE.ShapeBufferGeometry( shape );

    geometryShape.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );

    const meshShape = new THREE.Mesh( geometryShape, material );
    meshShape.position.copy( vertex );
    meshShape.rotation.z = angleRadians;
    meshShape.name = 'interior-wall-' + ( i + 1 );
    // For Azimuth
    //meshShape.userData.angle = angleRadians

    obj.add( meshShape );

  }

}

function drawInteriorWallsDiagonal( vertices1, vertices2, obj, theBuilding ) {

  theBuilding.materialParameters.color = theBuilding.colors.InteriorWall;
  theBuilding.materialParameters.opacity = theBuilding.opacity;
  const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

  for ( let i = 0; i < vertices1.length - 1; i++ ) {

    const vertex1 = vertices1[ i ];
    const vertex2 = vertices2[ i ];
    const angleVector = vertex2.clone().sub( vertex1 );
    const angleRadians = Math.atan2( angleVector.y, angleVector.x );

    const length = vertex1.distanceTo( vertex2 );

    const verticesShape = [ v2( 0, 0 ), v2( length, 0 ), v2( length, theBuilding.storeyHeight ), v2( 0, theBuilding.storeyHeight ) ];

    const shape = new THREE.Shape( verticesShape );
    const geometryShape = new THREE.ShapeBufferGeometry( shape );
    geometryShape.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );

    const meshShape = new THREE.Mesh( geometryShape, material );
    meshShape.position.copy( vertex1 );
    meshShape.rotation.z = angleRadians;
    meshShape.name = 'interior-wall-diagonal-' + ( i + 1 );
    obj.add( meshShape );
  }

}

  function setWallWindowPropertys(inputBuilding,surfaceAngle)
  {
    // Parse int to get rounding
    surfaceAngle = parseInt(Math.round(surfaceAngle))

    if (inputBuilding.wwrByBuilding)
    {
      // Building level WWR
      windowToWallRatio = inputBuilding.wwr;
      numOfWindows = inputBuilding.noWindows;
      windowRatio = inputBuilding.windowRatio;
      overhangDepth = inputBuilding.overHangDepth

      finDepth = inputBuilding.finDepth
    }
    else
    {
      // TODO to self need a better way of raising a error when a property is undefined JS doesnt do this by default!!!
      // Facade level WWR
      if (surfaceAngle == 0)
      {
        // North
        windowToWallRatio = inputBuilding.wwrN

        numOfWindows = inputBuilding.noWindowsN
        windowRatio = inputBuilding.windowRatioN
        overhangDepth = inputBuilding.overHangDepthN
        finDepth = inputBuilding.finDepthN

      }
      else if (surfaceAngle == 90)
      {

        // West
        windowToWallRatio = inputBuilding.wwrW

        numOfWindows = inputBuilding.noWindowsW
        windowRatio = inputBuilding.windowRatioW

        overhangDepth = inputBuilding.overHangDepthW
        finDepth = inputBuilding.finDepthW
      }
      else if (surfaceAngle == 180)
      {
        // South
        windowToWallRatio = inputBuilding.wwrS

        numOfWindows = inputBuilding.noWindowsS
        windowRatio = inputBuilding.windowRatioS

        overhangDepth = inputBuilding.overHangDepthS
        finDepth = inputBuilding.finDepthS

      }
      else if (surfaceAngle == -90 )
      {

        // East
        windowToWallRatio = inputBuilding.wwrE
        numOfWindows = inputBuilding.noWindowsE
        windowRatio = inputBuilding.windowRatioE

        overhangDepth = inputBuilding.overHangDepthE
        finDepth = inputBuilding.finDepthE

      }
      else {
        throw new Error(surfaceAngle.toString()+' is an Invalid angle')
      }
    }

    return {wwr:windowToWallRatio,noWindows:numOfWindows,windowRatio:windowRatio,overhangDepth:overhangDepth,finDepth:finDepth}
  }

  function drawExteriorWalls(inputBuilding,height, vertices, obj,theBuilding,flip = false) {

    theBuilding.materialParameters.color = theBuilding.colors.ExteriorWall;
    theBuilding.materialParameters.opacity = theBuilding.opacity;
    const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

    for ( let i = 0; i < vertices.length - 1; i++ ) {

      const vertex = vertices[ i ];

      const vertexNext = i < vertices.length - 1 ? vertices[ i + 1 ] : vertices[ 0 ];
      const angleVector = vertexNext.clone().sub( vertex ).normalize();
      const angleRadians = Math.atan2( angleVector.y, angleVector.x );

      const length = vertex.distanceTo( vertexNext );

      var wallSurfaceAngle = angleRadians*(180/ Math.PI );

      windowProperties = setWallWindowPropertys(inputBuilding,wallSurfaceAngle)


      // NOTE compared to create-exportable-buildings-latest.html drawOpenings is the substiute for drawWallWithHoles function
      const wall = drawOpenings( length,height, obj,windowProperties,theBuilding,flip);

      wall.name = 'exterior-wall-'  + ( i + 1 );
      wall.position.copy( vertex );
      wall.rotation.z = angleRadians;

      wall.userData.length = length;
      wall.userData.lengthDelta = length / windowProperties.noWindows;
      wall.userData.angle = angleRadians;

      // TODO Draw the actual glass material - hold off on drawing the actual windows for now
      //drawWindows( length, wall );

      obj.add( wall );
    }
  }
  // length,height, obj,windowProperties.wwr,windowProperties.noWindows,windowProperties.windowRatio,this
  function drawOpenings( length,height,obj,windowProperties,theBuilding,flip ) {
    // windowProperties.wwr,windowProperties.noWindows,windowProperties.windowRatio
    const lengthDelta = length / windowProperties.noWindows;

    const wwr = windowProperties.wwr;
    const windowRatio = windowProperties.windowRatio
    const hgt05 = height * 0.5;

    let holes = [];
    //const wall = new THREE.Group();
    //single shape with multiple openings??

    const len05 = length * 0.5;

      verticesWall = [
        v( length, 0, 0 ),
        v( length, height, 0 ),
        v( 0, height, 0 ),
        v( 0, 0, 0 )
      ];

    const shape = new THREE.Shape( verticesWall );

    const lenD05 = lengthDelta * 0.5;
    const geometryBoundary = new THREE.Geometry();

    geometryBoundary.vertices = [
			v( -lenD05, hgt05, 0 ),
			v( lenD05, hgt05, 0 ),
			v( lenD05, -hgt05, 0 ),
			v( -lenD05, -hgt05, 0 )
		];

    let windowHeightRatio
    let windowWidthRatio

    let overhangMeshes = []
    let finMeshes = []

    // Use Exterior wall color
    theBuilding.materialParameters.color = theBuilding.colors.ExteriorWall;
    theBuilding.materialParameters.opacity = theBuilding.opacity;
    const material = new THREE.MeshPhongMaterial( theBuilding.materialParameters );

    for ( let i = 0; i < windowProperties.noWindows; i++ ) {
      // NOTE this section (in the for loop) is slightly different to lines 853 to 865 of create-exportable-buildings-latest.html

      let maxWindowArea = lengthDelta*height * wwr
      let maxWindowBorderVertical = (1.0 - wwr) * height
      let windowHeight = height - (maxWindowBorderVertical * windowRatio)
      let windowWidth = maxWindowArea / windowHeight

      windowWidthRatio = windowWidth/lengthDelta
      windowHeightRatio = windowHeight/height

      const geometryOpening = geometryBoundary.clone().scale(windowWidthRatio,windowHeightRatio,1);

      geometryOpening.translate( i * lengthDelta + lenD05, hgt05, 0 );

      const verticesOpening = geometryOpening.vertices;

      //console.log(verticesOpening)

      const hole = new THREE.Path();

      hole.fromPoints( verticesOpening );

      shape.holes.push( hole );
      //.updateMatrixWorld( true )

      const geometryHoles = geometryOpening.clone().applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );

      holes.push( geometryHoles.vertices );

      // Create overhangs
      const overhangDepth = windowProperties.overhangDepth
      // For placing fins and overhangs
      const windowTopRoofOffSet = geometryHoles.vertices[2].z

      if (overhangDepth > 0.5)
      {
        verticesOverhang = [
          v( lengthDelta * windowWidthRatio, 0, 0 ),
          v( lengthDelta * windowWidthRatio, overhangDepth, 0 ),
          v( 0, overhangDepth, 0 ),
          v( 0, 0, 0 )
        ];

        const shapeOverhang = new THREE.Shape( verticesOverhang );

        const geometryOverhang = new THREE.ShapeBufferGeometry(shapeOverhang );

        const meshOverhang = new THREE.Mesh( geometryOverhang, material );
        meshOverhang.name = 'overhang-' + ( i + 1 );

        meshOverhang.position.set( i * lengthDelta - lengthDelta * 0.5 * windowWidthRatio + lengthDelta / 2, 0 , height-windowTopRoofOffSet );

        overhangMeshes.push(meshOverhang)
      }

      const finDepth = windowProperties.finDepth

      if (finDepth > 0.5)
      {

        verticesFin = [
          v( 0, finDepth, 0 ),
          v( height * windowHeightRatio, finDepth, 0 ),
          v( height * windowHeightRatio, 0, 0 ),
          v( 0, 0, 0 )
        ];

        const shapeFin = new THREE.Shape( verticesFin );

        const geometryFin = new THREE.ShapeBufferGeometry(shapeFin );

        geometryFin.rotateY( Math.PI / 2 );
        //geometryFin.rotateY( -Math.PI/2 );
        //geometryFin.rotateX( Math.PI );
        const meshFin = new THREE.Mesh( geometryFin, material );

        meshFin.position.set( i * lengthDelta + lengthDelta * 0.5 * windowWidthRatio + lengthDelta / 2, 0 , height-windowTopRoofOffSet );

        //meshFin.position.set( i * lengthDelta + lengthDelta * 0.5 * windowWidthRatio + lengthDelta / 2, finDepth , height-windowTopRoofOffSet );

        meshFin.name = 'fin-1-' + ( i + 1 );

        const meshFin2 = meshFin.clone().rotateZ(-Math.PI);


        meshFin2.position.set( i * lengthDelta - lengthDelta * 0.5 * windowWidthRatio + lengthDelta / 2, finDepth, height-windowTopRoofOffSet );

        //meshFin2.position.set( i * lengthDelta - lengthDelta * 0.5 * windowWidthRatio + lengthDelta / 2, -finDepth, height-windowTopRoofOffSet );


        meshFin2.name = 'fin-2-' + ( i + 2 );

        finMeshes.push(meshFin)
        finMeshes.push(meshFin2)

      }

    }

    geometryShape = new THREE.ShapeBufferGeometry( shape );
    geometryShape.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );

    const meshWall = new THREE.Mesh( geometryShape, material );
    meshWall.userData.lengthDelta = lengthDelta;
    meshWall.userData.holes = holes;
    meshWall.name = 'wall';

    // NOTE these two lines do not appear in the working file create-exportable-buildings-latest.html
    meshWall.userData.windowWidthRatio = windowWidthRatio

    meshWall.userData.windowHeightRatio = windowHeightRatio

    // Add the overhangMeshes to the mesh wall
    for ( let i = 0; i < overhangMeshes.length ; i++ ) {
      meshWall.add(overhangMeshes[i]);
    }
    // Add the finMeshes to the mesh wall
    for ( let i = 0; i < finMeshes.length ; i++ ) {
      meshWall.add(finMeshes[i]);
    }

    //wall.add( meshWall );
    return meshWall;

  }

  function drawWindows( length, obj ) {
    // NOTE SUPERSEEDED
    // TODO function is for putting glass in wall - this is NOT needed for gbxml export
    const wwr = theBuilding.wwr / 100;
    // window material
    const material = new THREE.MeshPhongMaterial( { color: 0xf6feff, opacity: 0.5, transparent: true } );

    for ( let i = 0; i < obj.children[ 0 ].userData.holes.length; i++ ) {

      const lengthDelta = obj.userData.lengthDelta;

      const geometry = new THREE.PlaneBufferGeometry( lengthDelta * wwr, theBuilding.storeyHeight  * wwr );
      geometry.rotateX( Math.PI / 2 );

      const mesh = new THREE.Mesh( geometry, material );
      mesh.name = 'window-' + i;
      //			mesh.position.set( i * lengthDelta + 0.5 * lengthDelta, theBuilding.overhang * 0.5, theBuilding.storeyHeight * 0.5 + theBuilding.storeyHeight * 0.5  * wwr );

      mesh.position.set( i * lengthDelta + 0.5 * lengthDelta, 0, theBuilding.storeyHeight * 0.5  );

      obj.add( mesh );

    }

  }



  function offsetPoints( obj, points, offsetX, offsetY  = 0 ) {

    // 2017-11-17
      let lines = [];
      for ( let i = 0; i < points.length - 1; i++ ) {
        let pt1 = points[ i ];
        let pt2 = points[ i + 1 ];
        const angleVector = pt2.clone().sub( pt1 );
        const angle = Math.atan2( angleVector.y, angleVector.x );
        // redo with THREE.Spherical?
        // https://stackoverflow.com/questions/11039841/how-to-draw-parallel-line-using-three-js
        // https://stackoverflow.com/questions/43229743/offset-mesh-in-three-js
        const offsetPt1 = v( pt1.x - offsetX * Math.cos( angle - Math.PI / 2 ), pt1.y + offsetX * Math.sin( angle + Math.PI / 2 ), 0 );
        const offsetPt2 = v( pt2.x - offsetX * Math.cos( angle - Math.PI / 2 ), pt2.y + offsetX * Math.sin( angle + Math.PI / 2 ), 0 );
        const line = new THREE.Line3( offsetPt1, offsetPt2 );
        lines.push( line );
      }
    // if first and last point close, deal with it
      if ( points[ 0 ].distanceTo( points[ points.length - 1 ] ) < 0.01 ) {
        pt1 = intersectionTwoLines( lines[ 0 ], lines [ lines.length - 1 ] );
        pt2 = pt1;
      } else {
        pt1 = lines[ 0 ].start;
        pt2 = lines[ lines.length - 1 ].end;
      }
      const pointsOffset = [ v( pt1.x, pt1.y, offsetY ) ];
      for ( let i = 0; i < lines.length - 1; i++ ) {
        const pt = intersectionTwoLines( lines[ i ], lines [ i + 1 ] );
        pointsOffset.push( v( pt.x, pt.y, offsetY ) );
      }
      pointsOffset.push( pt2 );
      return pointsOffset;
    }

    function intersectionTwoLines( line1, line2 ) {
      // Use Three.js Ray?
      // 2016-02-10
      // Thanks to http://jsfiddle.net/justin_c_rounds/Gd2S2/ && http://jsfiddle.net/user/justin_c_rounds/fiddles/
      const line1start = line1.start;
      const line1end = line1.end;
      const line2start = line2.start;
      const line2end = line2.end;
      const denominator =
        ( line2end.y - line2start.y ) * ( line1end.x - line1start.x )
        - ( line2end.x - line2start.x ) * ( line1end.y - line1start.y );
      if ( denominator == 0 ) { return; }
      const a =
        ( ( line2end.x - line2start.x ) * ( line1start.y - line2start.y )
        - ( line2end.y - line2start.y ) * ( line1start.x - line2start.x ) ) / denominator;
      const x = line1start.x + ( a * ( line1end.x - line1start.x ) );
      const y = line1start.y + ( a * ( line1end.y - line1start.y ) );
      return new THREE.Vector3( x, y, 0 );
    }



  function createMesh() {

		const geometry = new THREE.BoxBufferGeometry( 1, 1, 1 ); // use scale to set size
		const material = new THREE.MeshPhongMaterial();
		const mesh = new THREE.Mesh( geometry, material );
		const edgesGeometry = new THREE.EdgesGeometry( geometry );
		const meshEdges = new THREE.LineSegments( edgesGeometry, new THREE.LineBasicMaterial( { color: 0x000000 } ) );
		mesh.add( meshEdges );

		return mesh;
	}

  function stringOfBuildingShapeToBuildingShapeEnum(selectedShapeType){

    if (selectedShapeType === "L-Shape")
    {
      return buildingShapes.Lshape
    }
    else if (selectedShapeType === "H-Shape")
    {
      return buildingShapes.Hshape
    }
    else if (selectedShapeType === "T-Shape")
    {
      return buildingShapes.Tshape
    }
    else if (selectedShapeType === "Box-Shape")
    {
      return buildingShapes.Boxshape
    }
    else if (selectedShapeType === "U-Shape")
    {
      return buildingShapes.Ushape
    }
    else if (selectedShapeType === "Plus-Shape")
    {
      return buildingShapes.Plusshape
    }
    else if (selectedShapeType === "Courtyardshape")
    {
      return buildingShapes.Courtyardshape
    }
    else {
      throw new Error('Cannot convert string '+selectedShapeType+ ' to building shape enum!!')
    }
  }
