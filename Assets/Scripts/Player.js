//@input Component.Camera sceneCamera
var camera = script.sceneCamera;

//@ui {"widget":"label","label":""}
// @input Physics.WorldComponent physicWorld;

//@input SceneObject pot
var potPhysicWorld = null;
//@input SceneObject reticle

//@ui {"widget":"label","label":""}
//@input Asset.ObjectPrefab ingredientPrefab
//@input Asset.ObjectPrefab[] ingredientPrefabs

var ingredients = [];

global.currentIngredient = null;

//@ui {"widget":"label","label":""}
//@ui {"widget":"label","label":"Ingredient Launch Params"}
//@input int trajectoryHeight = 30
//@input int maxDistanceAimAssist = 500

//@ui {"widget":"label","label":""}
//@ui {"widget":"label","label":"Debug Rendering"}
//@input Asset.ObjectPrefab helpTrajectoryObject

var instantiatedIngredient = null;
var helpTrajectoryObjects = [];

var isInitialized = false;
// Create a probe to raycast on the worldmesh
var globalProbe = Physics.createGlobalProbe();

var potProbe = null;

script.createEvent("OnStartEvent").bind(function (eventData) {
    script.ingredientPrefabs.forEach(element => {
        instantiatedIngredient = element.instantiate(script.physicWorld.getSceneObject());
        ingredients.push(instantiatedIngredient);
        instantiatedIngredient.enabled = false;
    });

    potPhysicWorld = script.pot.createComponent("Physics.WorldComponent");
    potProbe = potPhysicWorld.createProbe();
    // Set filter settings on it.
    potProbe.filter.includeStatic = true;
    potProbe.filter.includeDynamic = false;
    potProbe.filter.includeIntangible = false;

    // ingredients.forEach(element => {
    //     print(element.name);
    // });

    // var helpTrajectoryStep = 20;
    // for (var i = 0; i < helpTrajectoryStep; ++i) {
    //     var newTrajectoryObject = script.helpTrajectoryObject.instantiate(null);
    //     helpTrajectoryObjects[i] = newTrajectoryObject;
    //     helpTrajectoryObjects[i].enabled = false;
    // }
});


script.createEvent("TapEvent").bind(function (eventData) {
    if (isInitialized == false) {
        var camPos = camera.getTransform().getWorldPosition();
        var camForward = camera.getTransform().back;
        globalProbe.rayCast(camPos, camPos.add(camForward.uniformScale(script.maxDistanceAimAssist)), function (hit) {
            script.pot.enabled = true;
            script.pot.getTransform().setWorldPosition(hit.position);
            isInitialized = true;
        });
    }
    else if (global.currentIngredient !== null) {
        // print("currentIngredientnot null: " + global.currentIngredient.name);

        for (let index = 0; index < ingredients.length; index++) {
            const element = ingredients[index];
            if (element.name == global.currentIngredient.name)
                instantiatedIngredient = script.ingredientPrefabs[index].instantiate(potPhysicWorld.getSceneObject());
        }

        // for (var i = 0; i < helpTrajectoryObjects.length; ++i) {
        //     helpTrajectoryObjects[i].enabled = false;
        // }

        if (instantiatedIngredient !== null) {
            global.currentIngredient.destroy();
            global.currentIngredient = null;

            instantiatedIngredient.getTransform().setWorldPosition(camera.getTransform().getWorldPosition());
            var physicsBody = instantiatedIngredient.getComponent('Physics.BodyComponent');
            physicsBody.clearMotion();

            var camForward = camera.getTransform().back;
            var camPos = camera.getTransform().getWorldPosition();
            var end = camera.screenSpaceToWorldSpace(eventData.getTapPosition(), script.maxDistanceAimAssist);
            potProbe.rayCast(camPos, end, LaunchIngredient);
        }
    }
});

function LaunchIngredient(hit) {
    if (instantiatedIngredient === null) return;

    var camForward = camera.getTransform().back;
    var physicsBody = instantiatedIngredient.getComponent('Physics.BodyComponent');

    var ingredientStartPos = instantiatedIngredient.getTransform().getWorldPosition();
    var targetPos = ingredientStartPos.add(camForward.uniformScale(200));

    if (hit) targetPos = hit.position;

    // var newTrajectoryObject = script.helpTrajectoryObject.instantiate(null);
    // newTrajectoryObject.getTransform().setWorldPosition(targetPos);

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

    syncEntity.sendEvent(ingredient_op, encodeApi(message));
}

// On message Received
syncEntity.onEventReceived.add(ingredient_op, function (networkMessage) {
    if (networkMessage.senderUserId == global.sessionController.getLocalUserId()) return;
    // print(networkMessage.message);
    // print(networkMessage.data);
    // print(networkMessage.senderUserId);
    var message = decodeApi(networkMessage.data);

    // print("all users " + encodeApi(global.sessionController.getUsers()));
    // print("all users " + global.sessionController.getUsers());
    // print("An ingredient has been launched by " + global.sessionController.getUsers()[networkMessage.senderUserId].displayName);
    print("An ingredient has been launched");
    var startPos = global.getLocalPosFromPlan(message.params);
    var velocity = global.getLocalScaleFromPlan(message.params);
    var ingredient = script.ingredientPrefab.instantiate(script.physicWorld.getSceneObject());
    var physicsBody = ingredient.getComponent('Physics.BodyComponent');

    // ingredient.getComponent("Script").api.sharedIngredient = true;

    ingredient.getTransform().setWorldPosition(startPos);
    physicsBody.dynamic = true;
    physicsBody.addForce(velocity, Physics.ForceMode.VelocityChange);
    physicsBody.addTorque(new vec3(-15, 0, 0), Physics.ForceMode.VelocityChange);
});

// ----------------- Global Scope ------------------ //
global.ingredient_op = ingredient_op;