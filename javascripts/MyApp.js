var b2Vec2 = Box2D.Common.Math.b2Vec2
  , b2World = Box2D.Dynamics.b2World;

MyApp = function( veroldApp ) {

  this.veroldApp = veroldApp;  
  this.mainScene;
  this.camera;
  this.controls;
}

MyApp.prototype.startup = function( ) {

  var that = this;

  this.veroldApp.veroldEngine.Renderer.stats.domElement.hidden = true;

  this.veroldApp.loadScene( null, {
    
    success_hierarchy: function( scene ) {

      // hide progress indicator
      AppUI.hideLoadingProgress();
      AppUI.showUI();

      that.inputHandler = that.veroldApp.getInputHandler();
      that.renderer = that.veroldApp.getRenderer();
      that.picker = that.veroldApp.getPicker();
      
      //Bind to input events to control the camera
      that.veroldApp.on("keyDown", that.onKeyPress, that);
      that.veroldApp.on("mouseUp", that.onMouseUp, that);
      that.veroldApp.on("fixedUpdate", that.fixedUpdate, that );
      that.veroldApp.on("update", that.update, that );

      //Store a pointer to the scene
      that.mainScene = scene;
      
      var models = that.mainScene.getAllObjects( { "filter" :{ "model" : true }});
      var model = models[ _.keys( models )[0] ].threeData;
      
      //Create the camera
      that.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10000 );
      that.camera.up.set( 0, 1, 0 );
      that.camera.position.set( 0, 0.5, 1 );

      var lookAt = new THREE.Vector3();
      lookAt.add( model.center );
      lookAt.multiply( model.scale );
      lookAt.applyQuaternion( model.quaternion );
      lookAt.add( model.position );

      that.camera.lookAt( lookAt );

      //Tell the engine to use this camera when rendering the scene.
      that.veroldApp.setActiveCamera( that.camera );

      that.createMap();
      that.createPlayer();
    },

    progress: function(sceneObj) {
      var percent = Math.floor((sceneObj.loadingProgress.loaded_hierarchy / sceneObj.loadingProgress.total_hierarchy)*100);
      AppUI.setLoadingProgress(percent); 
    }
  });
}

MyApp.prototype.createMap = function() {
  var tileSet = this.veroldApp.getAssetRegistry().getAsset('5142749807591d8d300001cd');

  this.world = new b2World(new b2Vec2(0, 0), true);
  this.map = new Map(this.world, 18, 18)
  this.map.createTiles();

  this.mapView = new MapView(tileSet, this.mainScene, this.map);
  this.mapView.init();
}

MyApp.prototype.createPlayer = function() {
  var that = this
    , model = this.mainScene.getObject('514274ff53ffec0200000733');

  this.mainScene.removeChildObject(model);

  this.player = new Player(this.world, this.map);
  this.player.createBody(this.map.getStartingPositionXY());

  this.veroldApp.loadScript('javascripts/vendor/OrbitControls.js', function() {
    that.playerView = new PlayerView(model, that.mainScene, that.player, that.mapView);

    that.veroldApp.setActiveCamera( that.playerView.getCamera() );
  });
}

MyApp.prototype.shutdown = function() {
	
  this.veroldApp.off("keyDown", this.onKeyPress, this);
  this.veroldApp.off("mouseUp", this.onMouseUp, this);

  this.veroldApp.off("update", this.update, this );
}

  

MyApp.prototype.update = function( delta ) {
  if (this.playerView) this.playerView.update();
  if (this.controls) this.controls.update();
}

MyApp.prototype.fixedUpdate = function( delta ) {

}

MyApp.prototype.onMouseUp = function( event ) {
  
  if ( event.button == this.inputHandler.mouseButtons[ "left" ] && 
    !this.inputHandler.mouseDragStatePrevious[ event.button ] ) {
    
    var mouseX = event.sceneX / this.veroldApp.getRenderWidth();
    var mouseY = event.sceneY / this.veroldApp.getRenderHeight();
    var pickData = this.picker.pick( this.mainScene.threeData, this.camera, mouseX, mouseY );
    if ( pickData ) {
      //Bind 'pick' event to an asset or just let user do this how they want?
      if ( pickData.meshID == "51125eb50a4925020000000f") {
        //Do stuff
      }
    }
  }
}

MyApp.prototype.onKeyPress = function( event ) {
	
	var keyCodes = this.inputHandler.keyCodes;
  if ( event.keyCode === keyCodes['B'] ) {
    var that = this;
    this.boundingBoxesOn = !this.boundingBoxesOn;
    var scene = veroldApp.getActiveScene();
    
    scene.traverse( function( obj ) {
      if ( obj.isBB ) {
        obj.visible = that.boundingBoxesOn;
      }
    });
  
  }
    
}