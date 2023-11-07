// SyncMaterials.js
// Version: 1.0.1
// Event: On Awake
// Description: Synchronizes material properties across the network.
// Add this to a SceneObject and assign the material you want synchronized in Main Material. 
// Add each property name you want synchronized to the Property Names list. 
// Any changes to these properties will be automatically synchronized across the network. 

//@ui {"widget":"label", "label":"Sync Settings"}

//@input bool autoClone = true
/** @type {boolean} */
var autoClone = script.autoClone;

//@input Asset.Material mainMaterial
/** @type {Material} */
var mainMaterial = script.mainMaterial;

//@input string[] propertyNames
/** @type {string[]} */
var propertyNames = script.propertyNames;

var newMat = mainMaterial;

if (!mainMaterial) {
    print("You need to set mainMaterial!");
    return;
}

if (autoClone) {
    newMat = mainMaterial.clone();
    var visuals = getComponentsRecursive(script.getSceneObject(), "MaterialMeshVisual");
    for (var i=0; i<visuals.length; i++) {
        if (mainMaterial.isSame(visuals[i].mainMaterial)) {
            visuals[i].mainMaterial = newMat;
        }
    }
}

function deduceStorageType(propValue) {
    var dimensions = ["r", "g", "b", "a"];
    var dCount = 0;
    for (var i=0; i<dimensions.length; i++) {
        if (dimensions[i] in propValue) {
            dCount++;
        }
    }
    if (dCount > 1) {
        return [
            global.StorageTypes.vec2,
            global.StorageTypes.vec3,
            global.StorageTypes.vec4,
        ][dCount-2];
    }
    return global.StorageTypes.float;
}

var storageProps = new global.StoragePropertySet();

var mainPass = newMat.mainPass;
for (var j=0; j<propertyNames.length; j++) {
    var propName = propertyNames[j];
    var propVal = mainPass[propName];
    var type = deduceStorageType(propVal);
    var newProp = global.StorageProperty.forMaterialProperty(newMat, propName, type);
    storageProps.addProperty(newProp);
}


// eslint-disable-next-line no-unused-vars
var syncEntity = new global.SyncEntity(script, storageProps);

/**
* Returns a list of all Components of `componentType` found in the object and its children.
* @template {keyof ComponentNameMap} T
* @param {SceneObject} object Object to search
* @param {T} componentType Component type name to search for
* @param {ComponentNameMap[T][]=} results Optional list to store results in
* @returns {ComponentNameMap[T][]} Matching Components in `object` and children
*/
function getComponentsRecursive(object, componentType, results) {
    results = results || [];
    var components = object.getComponents(componentType);
    for (var i=0; i<components.length; i++) {
        results.push(components[i]);
    }
    var childCount = object.getChildrenCount();
    for (var j=0; j<childCount; j++) {
        getComponentsRecursive(object.getChild(j), componentType, results);
    }
    return results;
}