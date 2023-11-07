// AvatarController.js
// Version: 1.0.2
// Event: On Awake
// Description: Spawns and updates an avatar for the local player


//@input Component.ScriptComponent instantiator
/** @type {Instantiator} */
var instantiator = script.instantiator;

//@input Asset.ObjectPrefab myPrefab
/** @type {ObjectPrefab} */
var myPrefab = script.myPrefab;

//@input bool randomizeColor
/** @type {boolean} */
var randomizeColor = script.randomizeColor;

//@input string findObjectWithString
/** @type {string} */
var findObjectWithString = script.findObjectWithString;

/** @type {SceneObject} */
var mySceneObject;

/** @type {Camera} */
var myCamera;

/** @type {Transform} */
var myTransform;

/** @type {Transform} */
var camTransform;

function onReady() {
    
    var worldPos = camTransform.getWorldPosition();
    var worldRot = applyRotationOffset(camTransform);

    var options = new global.InstantiationOptions();
    options.onSuccess = onSpawned;
    options.persistence = RealtimeStoreCreateOptions.Persistence.Owner;
    options.claimOwnership = true;
    options.worldPosition = worldPos;
    options.worldRotation = worldRot;

    instantiator.instantiate(myPrefab, options);
}

/**
 * 
 * @param {NetworkRootInfo} networkRoot 
 */
function onSpawned(networkRoot) {
    mySceneObject = networkRoot.instantiatedObject;
    myTransform = mySceneObject.getTransform();
    script.createEvent("UpdateEvent").bind(onUpdate);

    if (randomizeColor) {
        var visual = getComponentRecursive(mySceneObject, "Component.MaterialMeshVisual");
        if (visual) {
            var color = new vec4(Math.random(), Math.random(), Math.random(), 1.0);
            visual.mainPass.baseColor = color;
        }
    }
}

function onUpdate() {
   
    myTransform.setWorldPosition(camTransform.getWorldPosition());
    myTransform.setWorldRotation(applyRotationOffset(camTransform));
    
}

function applyRotationOffset(transform){
    var rot = transform.getWorldRotation().toEulerAngles();
    rot = new vec3(Math.PI/180.0 -rot.x, rot.y+Math.PI, Math.PI/180.0-rot.z );
    return quat.fromEulerAngles(rot.x,rot.y,rot.z);
}


function init() {
    myCamera = findObjectWithName(findObjectWithString);
    if(!myCamera){
        print("Can't find correct Camera Object.");
        return;
    }
    camTransform =  myCamera.getTransform();
    instantiator.notifyOnReady(onReady);
}

script.createEvent("OnStartEvent").bind(init);

script.getAvatar = function() {
    return mySceneObject;
};



/**
* Returns the first Component of `componentType` found in the object or its children.
* @template {keyof ComponentNameMap} T
* @param {SceneObject} object Object to search
* @param {T} componentType Component type name to search for
* @returns {ComponentNameMap[T]} Matching Components in `object` and its children
*/
function getComponentRecursive(object, componentType) {
    var component = object.getComponent(componentType);
    if (component) {
        return component;
    }
    var childCount = object.getChildrenCount();
    for (var i=0; i<childCount; i++) {
        var result = getComponentRecursive(object.getChild(i), componentType);
        if (result) {
            return result;
        }
    }
    return null;
}

/**
 * Returns the first SceneObject found with a matching name.
 * NOTE: This function recursively checks the entire scene and should not be used every frame.
 * It's recommended to only run this function once and store the result.
 * @param {string} objectName Object name to search for
 * @returns {SceneObject?} Found object (if any)
 */
function findObjectWithName(objectName) {
    var rootObjectCount = global.scene.getRootObjectsCount();
    var obj;
    var res;
    for (var i=0; i< rootObjectCount; i++) {
        obj = global.scene.getRootObject(i);
        if (obj.name == objectName) {
            return obj;
        }
        res = findChildObjectWithName(global.scene.getRootObject(i), objectName);
        if (res) {
            return res;
        }
    }
    return null;
}

/**
 * Searches through the children of `sceneObject` and returns the first child found with a matching name.
 * NOTE: This function recursively checks the entire child hierarchy and should not be used every frame.
 * It's recommended to only run this function once and store the result.
 * @param {SceneObject} sceneObject Parent object to search the children of
 * @param {string} childName Object name to search for
 * @returns {SceneObject?} Found object (if any)
 */
function findChildObjectWithName(sceneObject, childName) {
    var childCount = sceneObject.getChildrenCount();
    var child;
    var res;
    for (var i=0; i<childCount; i++) {
        child = sceneObject.getChild(i);
        if (child.name == childName) {
            return child;
        }
        res = findChildObjectWithName(child, childName);
        if (res) {
            return res;
        }
    }
    return null;
}
