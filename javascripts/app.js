var b2Vec2 = Box2D.Common.Math.b2Vec2
  , b2Math = Box2D.Common.Math.b2Math
  , b2BodyDef = Box2D.Dynamics.b2BodyDef
  , b2Body = Box2D.Dynamics.b2Body
  , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
  , b2Fixture = Box2D.Dynamics.b2Fixture
  , b2World = Box2D.Dynamics.b2World
  , b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef
  , b2MassData = Box2D.Collision.Shapes.b2MassData
  , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
  , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
  , b2AABB = Box2D.Collision.b2AABB
  , b2DebugDraw = Box2D.Dynamics.b2DebugDraw
  , world;

function getBodyAtMouse(mouseX, mouseY) {
  var mousePVec = new b2Vec2(mouseX, mouseY);
  var aabb = new b2AABB();
  aabb.lowerBound.Set(mouseX - 0.001, mouseY - 0.001);
  aabb.upperBound.Set(mouseX + 0.001, mouseY + 0.001);
  // Query the world for overlapping shapes.
  selectedBody = null;
  world.QueryAABB(function(fixture) {
    if(fixture.GetBody().GetType() != b2Body.b2_staticBody) {
      if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mousePVec)) {
        selectedBody = fixture.GetBody();
        return false;
      }
    }
    return true;
  }, aabb);
  return selectedBody;
}

function Mob(world, map, opts) {
  this.world = world;
  this.map = map;
  this.isPlayer = opts && opts.isPlayer || false;
  this.speed = opts && opts.speed || 5;
  this.positionXY = opts && opts.position || this.map.positionToXY(this.map.getStartingPosition());
}

Mob.prototype.realign = function() {
  var velocity = this.body.GetLinearVelocity()
    , angle;

  if (velocity.x == 0) {
      angle = velocity.y > 0 ? 0 : Math.PI;
  } else if(velocity.y == 0) {
      angle = velocity.x > 0 ? Math.PI/2 : 3 * Math.PI/2;
  } else {
      angle = Math.atan(velocity.y / velocity.x) + Math.PI/2;
  }

  if (velocity.x > 0) {
      angle += Math.PI;
  }

  this.body.SetAngle(angle + Math.PI/2);
}

Mob.prototype.createBody = function() {
  var fixDef, bodyDef

  fixDef = new b2FixtureDef;
  fixDef.density = 1.0;
  fixDef.friction = 0.5;
  fixDef.restitution = 0.2;

  fixDef.shape = new b2CircleShape(0.25);

  bodyDef = new b2BodyDef;
  bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position.x = this.positionXY.x + 0.5;
  bodyDef.position.y = this.positionXY.y + 0.5;

  this.body = this.world.CreateBody(bodyDef);

  this.body.CreateFixture(fixDef);

  this.createMouseJoint();
}

Mob.prototype.createMouseJoint = function() {
  var md = new b2MouseJointDef();
  md.maxForce = 100 * this.speed * this.body.GetMass();
  md.frequencyHz = 60;
  md.dampingRatio = 25 * (10 - this.speed);
  md.collideConnected = true;

  md.bodyA = this.world.GetGroundBody();
  md.bodyB = this.body;
  md.target.Set(this.positionXY.x + 0.5, this.positionXY.y + 0.5);
  this.mouseJoint = this.world.CreateJoint(md);
  this.body.SetAwake(true);
}

Mob.prototype.setTarget = function(x, y) {
  this.mouseJoint.SetTarget(new b2Vec2(x, y));
}

function Map(world) {
  this.world = world;
  this.mapWidth = 20;
  this.mapHeight = 20;
  this.cells = {
    WALL: 0,
    CORRIDOR: 1,
    ROOM: 2,
    DOOR: 3,
    ENTRANCE: 4,
    EXIT: 5
  };

  var r = dungCarv({
    mapWidth: this.mapWidth,
    mapHeight: this.mapHeight,
    padding: 1,
    randomness: 10 / 100.0,
    twistness: 20 / 100.0,
    rooms: 25 / 100.0,
    roomSize: [
      { min: 4, max: 10, prob: 1 } 
    ],
    roomRound: false,
    loops: 0 / 100.0,
    spaces: 0,
    loopSpaceRepeat: 2,
    eraseRoomDeadEnds: true,
    spacesBeforeLoops: false
  });

  for (var i in r.map) {
    if (r.map[i] == this.cells.ENTRANCE)  {
      this.startX = i % this.mapWidth;
      this.startY = Math.floor(i / this.mapHeight);
    }
  }

  this.map = r.map;
}

Map.prototype.createTiles = function() {
  var i;
  for (i = 0; i < this.map.length; i++) {
    this.createTile(i);
  }
}

Map.prototype.getStartingPosition = function() {
  return this.startY * this.mapWidth + this.startX;
}

Map.prototype.positionToXY = function(idx) {
  var xy = { x: idx % this.mapWidth
           , y: Math.floor(idx / this.mapWidth) };

  return xy;
}

Map.prototype.getRandomSpawnXY = function() {
  var that = this;

  getRandomPosition = function() {
    var x = Math.floor(Math.random() * that.mapWidth)
      , y = Math.floor(Math.random() * that.mapHeight)
      , pos = y * that.mapHeight + x;

    if (that.map[pos] == that.cells.CORRIDOR) {
      return { x: x, y: y };
    } else {
      return getRandomPosition();
    }
  }

  return getRandomPosition();
}

Map.prototype.createTile = function(pos) {
  var xy = this.positionToXY(pos)
    , tile = this.map[pos]
    , fixDef
    , bodyDef

  if (tile != this.cells.WALL) return;

  fixDef = new b2FixtureDef;
  fixDef.density = 1.0;
  fixDef.friction = 0.5;
  fixDef.restitution = 0.2;

  fixDef.shape = new b2PolygonShape;
  fixDef.shape.SetAsBox(0.5, 0.5);

  bodyDef = new b2BodyDef;
  bodyDef.type = b2Body.b2_staticBody;
  bodyDef.position.x = xy.x + 0.5;
  bodyDef.position.y = xy.y + 0.5;

  this.world.CreateBody(bodyDef).CreateFixture(fixDef);
}

function init() {
  world = new b2World(new b2Vec2(0, 0), true);

  var map = new Map(world);
  map.createTiles();

  var player = new Mob(world, map, { isPlayer: true });
  player.createBody();

  var creatures = [];
  var spawnXY;

  for (var i = 0; i< 20; i++) {
    spawnXY = map.getRandomSpawnXY();
    creatures.push(new Mob(world, map, { speed: 0.5, position: spawnXY }));
    creatures[i].createBody();
  }

   //setup debug draw
  var debugDraw = new b2DebugDraw();
  debugDraw.SetSprite(document.getElementById("canvas").getContext("2d"));
  debugDraw.SetDrawScale(512/map.mapWidth);
  debugDraw.SetFillAlpha(0.3);
  debugDraw.SetLineThickness(1.0);
  debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
  world.SetDebugDraw(debugDraw);
  window.setInterval(update, 1000 / 15);

  var canvasWidth = $('canvas').width()
    , canvasHeight = $('canvas').height();

  function mousedown(e) {
    var x = e.clientX / (canvasWidth/map.mapWidth)
      , y = e.clientY / (canvasHeight/map.mapHeight)
      , body;

    if (body = getBodyAtMouse(x, y)) {
      console.log(body);
    } else {
      player.setTarget(x, y);
    }
  }

  document.addEventListener('touchup', function(e) {
    event.preventDefault();

      var touches = event.changedTouches, first = touches[0];

      mousedown({ clientX: first.clientX, clientY: first.clientY });
  });


  $('canvas').mouseup(mousedown);

  setInterval(function() {
    var i, creature, distance;

    player.realign();

    for (i = 0; i < creatures.length; i++) {
      creature = creatures[i];
      distance = b2Math.SubtractVV(player.body.GetPosition(), creature.body.GetPosition()).Length();
      if (distance < 5) {
        creature.isActive = true;
        creature.setTarget(player.body.GetPosition().x, player.body.GetPosition().y);

        creature.realign();
      } else {
        if (creature.isActive) {
          creature.setTarget(creature.body.GetPosition().x, creature.body.GetPosition().y);
          creature.isActive = false;
        }
      }
    }
  }, 1000/60);
};

function update() {
   world.Step(
         1 / 15   //frame-rate
      ,  1       //velocity iterations
      ,  1       //position iterations
   );
   world.DrawDebugData();
   world.ClearForces();
};

$(function() {
  init();
});
