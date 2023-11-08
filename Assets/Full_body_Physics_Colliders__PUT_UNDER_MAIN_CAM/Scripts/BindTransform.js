// BindTransform.js
// Version: 0.1.0
// Event: Lens Initialized
// Description: Provide functions to bind 
// it's transform to another object based on
// body Tracking event
// @input SceneObject sourceObject
// @input SceneObject bindObject
// @input Component.ObjectTracking3D bodyTracking

if (!script.bindObject) {
    print("ERROR: Bind object is not set");
    return;
}

if (!script.sourceObject) {
    print("ERROR: Source object to copy transform from is not set");
    return;
}

if (!script.bodyTracking) {
    print("ERROR: 3D Body Tracking is not set");
    return;
}

var transform = script.bindObject.getTransform();
var bindedTransform = script.sourceObject.getTransform();

script.createEvent("UpdateEvent").bind(onUpdate);
function onUpdate() {
    
    if(!script.bodyTracking.isTracking)
    {
        return;
    }else{
        applyTransform(); 
    }

}
function applyTransform() {    

        transform.setWorldPosition(bindedTransform.getWorldPosition());  

}