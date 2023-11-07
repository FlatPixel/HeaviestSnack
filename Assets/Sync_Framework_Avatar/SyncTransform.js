// SyncTransform.js
// Version: 1.0.1
// Event: On Awake
// Description: Add this to any SceneObject to automatically synchronize its position, rotation, and/or scale, 
// depending on the settings chosen in the Inspector panel.


//@ui {"widget":"label", "label":"Sync Settings"}

//@input string positionSync = "local" {"widget":"combobox", "values":[{"label":"None", "value":"none"}, {"label":"Local", "value":"local"}, {"label":"World", "value":"world"}]}
/** @type {string} */
var positionSync = script.positionSync;

//@input string rotationSync = "local" {"widget":"combobox", "values":[{"label":"None", "value":"none"}, {"label":"Local", "value":"local"}, {"label":"World", "value":"world"}]}
/** @type {string} */
var rotationSync = script.rotationSync;

//@input string scaleSync = "none" {"widget":"combobox", "values":[{"label":"None", "value":"none"}, {"label":"Local", "value":"local"}, {"label":"World", "value":"world"}]}
/** @type {string} */
var scaleSync = script.scaleSync;

//@ui {"widget":"separator"}

//@input string persistence = "Session" {"widget":"combobox", "values":[{"label":"Ephemeral", "value":"Ephemeral"},{"label":"Owner", "value":"Owner"},{"label":"Session", "value":"Session"},{"label":"Persist", "value":"Persist"}]}
/** @type {RealtimeStoreCreateOptions.Persistence} */
var persistence = RealtimeStoreCreateOptions.Persistence[script.persistence];

//@input float sendsPerSecondLimit = 10
/** @type {number} */
var sendsPerSecondLimit = script.sendsPerSecondLimit;

//@input bool useSmoothing
/** @type {boolean} */
var useSmoothing = script.useSmoothing;

//@input float interpolationTarget = -.25 {"showIf":"useSmoothing"}
/** @type {number} */
var interpolationTarget = script.interpolationTarget;

var storageProps = new global.StoragePropertySet();

/**
 * @param {(transform:Transform, local:boolean)=>StorageProperty<Transform>} func 
 * @param {string} settings 
 */
function addPropertyHelper(func, settings) {
    if (settings != "none") {
        var local = (settings == "local");
        var prop = storageProps.addProperty(func(script.getTransform(), local));
        prop.sendsPerSecondLimit = sendsPerSecondLimit;
        if (useSmoothing) {
            prop.setSmoothing({ "interpolationTarget": interpolationTarget });
        }
        return prop;
    }
}

addPropertyHelper(global.StorageProperty.forPosition, positionSync);
addPropertyHelper(global.StorageProperty.forRotation, rotationSync);
addPropertyHelper(global.StorageProperty.forScale, scaleSync);

// eslint-disable-next-line no-unused-vars
var syncEntity = new global.SyncEntity(script, storageProps, false, persistence);