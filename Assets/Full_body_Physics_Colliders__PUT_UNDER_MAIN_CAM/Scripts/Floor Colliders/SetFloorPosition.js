// SetFloorPosition.js
// Version: 0.1.0
// Event: On Awake
// Description: Calculate Floor World Position based on 3D Body Tracking
// @input SceneObject leftFootObject
// @input SceneObject rightFootObject
// @input SceneObject hipObject
// @input int heightOffset

if (!script.leftFootObject) {
    print("ERROR: Left Foot Object is not set");
    return;
}

if (!script.rightFootObject) {
    print("ERROR: Right Foot Object is not set");
    return;
}

if (!script.hipObject) {
    print("ERROR: Hip Object is not set");
    return;
}

var sceneObject = script.getSceneObject();
var transform = sceneObject.getTransform();

var leftbindedTransform = script.leftFootObject.getTransform();
var rightbindedTransform = script.rightFootObject.getTransform();
var hipbindedTransform = script.hipObject.getTransform();

script.createEvent("UpdateEvent").bind(onUpdate);
function onUpdate() {
 
    applyTransform();
}

function applyTransform() {
       
    var leftHeight = leftbindedTransform.getWorldPosition().y;
    var rightHeight = rightbindedTransform.getWorldPosition().y;
    var x = hipbindedTransform.getWorldPosition().x;
    var y = leftHeight<rightHeight ? leftHeight : rightHeight;
    var z = hipbindedTransform.getWorldPosition().z;
    transform.setWorldPosition((new vec3(x,y - script.heightOffset,z)));  
}