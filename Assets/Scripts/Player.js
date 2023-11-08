//@input Component.Camera sceneCamera
var camera = script.sceneCamera;

//@ui {"widget":"label","label":""}
// @input Physics.WorldComponent potPhysicWorld;
//@input SceneObject pot
//@input SceneObject reticle

//@ui {"widget":"label","label":""}
//@input Asset.ObjectPrefab ingredientPrefab

//@ui {"widget":"label","label":""}
//@ui {"widget":"label","label":"Ingredient FPS Placement"}
//@input vec3 offset
//@input float cooldownApparition = 1
//@input float offsetAnim = 30

//@ui {"widget":"label","label":""}
//@ui {"widget":"label","label":"Ingredient Launch Params"}
//@input int trajectoryHeight = 30
//@input int maxDistanceAimAssist = 500

//@ui {"widget":"label","label":""}
//@ui {"widget":"label","label":"Debug Rendering"}
//@input Asset.ObjectPrefab helpTrajectoryObject

var instantiatedIngredient = null;
var timerCooldown = 1;
var offsetAnim = script.offsetAnim;
var helpTrajectoryObjects = [];

// Create a probe to raycast through only the implicit root world.
var probe = script.potPhysicWorld.createProbe();
// Set filter settings on it.
probe.filter.includeStatic = true;
probe.filter.includeDynamic = false;
probe.filter.includeIntangible = false;

// script.createEvent("OnStartEvent").bind(function(eventData) {
//    for (var i = 0; i < helpTrajectoryStep; ++i)  
//    {
//        var newTrajectoryObject = script.helpTrajectoryObject.instantiate(null);
//        helpTrajectoryObjects[i] = newTrajectoryObject;
//        helpTrajectoryObjects[i].enabled = false;
//    }
// });

script.createEvent("UpdateEvent").bind(function (eventData) {
    var potDistance = camera.getTransform().getWorldPosition()
        .distance(script.pot.getTransform().getWorldPosition());

    timerCooldown -= getDeltaTime();
    if (instantiatedIngredient === null && timerCooldown < 0) {
        instantiatedIngredient = script.ingredientPrefab.instantiate(script.potPhysicWorld.getSceneObject());
        offsetAnim = script.offsetAnim;
    }
    if (instantiatedIngredient !== null) {
        offsetAnim = offsetAnim + 0.2 * (0 - offsetAnim); // Filter to smooth the apparition
        var camTransform = camera.getTransform();
        var ingredientPos = camTransform.getWorldPosition()
            .add(camTransform.forward.uniformScale(script.offset.z))
            .add(camTransform.up.uniformScale(script.offset.y - offsetAnim))
            .add(camTransform.right.uniformScale(script.offset.x));
        instantiatedIngredient.getTransform().setWorldPosition(ingredientPos);
    }
});


script.createEvent("TouchEndEvent").bind(function (eventData) {
    for (var i = 0; i < helpTrajectoryObjects.length; ++i) {
        helpTrajectoryObjects[i].enabled = false;
    }

    if (instantiatedIngredient !== null) {
        timerCooldown = script.cooldownApparition;

        var physicsBody = instantiatedIngredient.getComponent('Physics.BodyComponent');
        physicsBody.clearMotion();

        var camForward = camera.getTransform().back;
        var camPos = camera.getTransform().getWorldPosition();
        probe.rayCast(camPos, camPos.add(camForward.uniformScale(script.maxDistanceAimAssist)), LaunchIngredient);
        print("touch ended rayCast");
    }
});

function LaunchIngredient(hit) {
    if (instantiatedIngredient === null) return;

    print("LaunchIngredient");
    var camForward = camera.getTransform().back;
    var physicsBody = instantiatedIngredient.getComponent('Physics.BodyComponent');

    var ingredientStartPos = instantiatedIngredient.getTransform().getWorldPosition();
    var targetPos = ingredientStartPos.add(camForward.uniformScale(200));

    if (hit) targetPos = hit.position;

    // helpTrajectoryObjects[helpTrajectoryObjects.length - 1].getTransform().setWorldPosition(targetPos);
    // helpTrajectoryObjects[helpTrajectoryObjects.length - 1].enabled = true;

    velocity = global.GetTrajectoryVelocityByHeight(ingredientStartPos, targetPos, script.trajectoryHeight);
    physicsBody.dynamic = true;
    physicsBody.addForce(velocity, Physics.ForceMode.VelocityChange);
    physicsBody.addTorque(new vec3(-15, 0, 0), Physics.ForceMode.VelocityChange);

    launchIngredientMessage(ingredientStartPos, velocity);

    // var helpTrajectoryPositions = global.GetBallisticPath(ingredientStartPos, velocity.normalize(), velocity.length, 0.02, 100);

    // for (var i = 0; i < helpTrajectoryObjects.length; ++i) {
    //     if (i > helpTrajectoryPositions.length - 1) break;

    //     helpTrajectoryObjects[i].getTransform().setWorldPosition(helpTrajectoryPositions[i]);
    //     helpTrajectoryObjects[i].enabled = true;
    // }

    instantiatedIngredient = null;
}

// ---------------------- Network Messages ----------------------//

/**
 * @enum {string}
 */
var ingredient_op = "launchIngredient";

var decodeApi = JSON.parse;
var encodeApi = JSON.stringify;

var syncEntity = new SyncEntity(script);
syncEntity.notifyOnReady(function () {
    print("The session has started and this entity is ready!");
});

// Send message
function launchIngredientMessage(ingredientStartPos, velocity) {
    var plan = global.writeTransformPartsToPlan({}, ingredientStartPos, null, velocity);
    var message = {
        op: ingredient_op,
        time: global.sessionController.getServerTimeInSeconds(), // time in s
        params: plan
    };

    print("An ingredient is launched");
    syncEntity.sendEvent(ingredient_op, encodeApi(message));
}

// On message Received
syncEntity.onEventReceived.add(ingredient_op, function (networkMessage) {
    print(networkMessage.message);
    print(networkMessage.data);
    print(networkMessage.senderUserId);
    var message = decodeApi(networkMessage.data);

    // print("all users " + encodeApi(global.sessionController.getUsers()));
    // print("all users " + global.sessionController.getUsers());
    // print("An ingredient has been launched by " + global.sessionController.getUsers()[networkMessage.senderUserId].displayName);
    print("An ingredient has been launched");
    var startPos = global.getLocalPosFromPlan(message.params);
    var velocity = global.getLocalScaleFromPlan(message.params);
    var ingredient = script.ingredientPrefab.instantiate(script.potPhysicWorld.getSceneObject());
    var physicsBody = ingredient.getComponent('Physics.BodyComponent');

    // ingredient.getComponent("Script").api.sharedIngredient = true;

    ingredient.getTransform().setWorldPosition(startPos);
    physicsBody.dynamic = true;
    physicsBody.addForce(velocity, Physics.ForceMode.VelocityChange);
    physicsBody.addTorque(new vec3(-15, 0, 0), Physics.ForceMode.VelocityChange);
});

// ----------------- Global Scope ------------------ //
global.ingredient_op = ingredient_op;