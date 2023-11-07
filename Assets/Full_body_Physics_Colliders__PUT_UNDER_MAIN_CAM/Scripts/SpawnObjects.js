// SpawnObjects.js
// Version 0.1.0
// Event : onAwake
// Spawn objects in circle layout based on the intervals
// @input SceneObject spawnObject
// @input SceneObject piviotObject
// @input SceneObject parentObject
// @input float loopInterval = 0.5
// @input float spawnTime = 0.5
// @input float angleInterval = 20
// @input float spawnRadius = 8

var piviotObjectTransform;
var initialized = false;
var timer = 0;
var count = 0;
var radius = script.spawnRadius;
var angleDegrees = script.angleInterval;

function spawnObjects(basePosition, i) {
    
	var angleRadians = angleDegrees * Math.PI / 180;   
	var x = radius * Math.cos (i * angleRadians);
	var z = radius * Math.sin (i * angleRadians);
   
	var pos = new vec3(basePosition.x + x, basePosition.y, basePosition.z + z);
    var obj = script.parentObject.copyWholeHierarchy(script.spawnObject);
    obj.enabled = true;
    obj.getTransform().setLocalPosition(pos);

}


script.createEvent("UpdateEvent").bind(function () {
    if (!initialized) {
        return;
    }
    
    timer += getDeltaTime();
    if (timer > script.loopInterval) {
        timer = 0;       
        count =0;
    }
    
   if (timer < script.spawnTime) {
        spawnObjects(piviotObjectTransform.getWorldPosition(),count);
        count++;
    }
});


function checkInputValues() {
    if (script.spawnObject == null) {
        print("ERROR: Make sure to set Spawn Object");
        return false;
    }
    if (script.piviotObject == null) {
        print("ERROR: Make sure to set Piviot Object");
        return false;
    }

    if (script.parentObject == null) {
        print("ERROR: Make sure to set Parent Object");
        return false;
    }

    return true;
}

function initialize() {
   
    if (checkInputValues()) {
               
        piviotObjectTransform = script.piviotObject.getTransform();
        initialized = true;

    }
    
}

initialize();