//@input Component.Camera sceneCamera
var camera = script.sceneCamera;

//@input SceneObject scene
//@input Component.Text debug

//@input Component.Text counter

//@input Physics.ColliderComponent collider

//@input Component.AnimationMixer potAnimationMixer

//@input Component.ScriptComponent promptController
/** @type {ScriptComponent} */
var promptController = script.promptController;

//@input SceneObject GPTBoxBoard

var tapped = false;

var holding = null;

global.counter = 0;

var ingredients = [];

var hasWon = false;

var item = 0;

var items = new Array();

for (i = 0; i < 999; i++) {

    items[i] = null;
}
var moments = new Array();

var sec = 0;

script.collider.onOverlapEnter.add(function (e) {

    if (holding) {
        global.counter++
        ingredients.push({ name: holding.name });
        showCounter();

        print(JSON.stringify(ingredients));

    }

});

script.collider.onOverlapExit.add(function (e) {
    global.counter--;
    showCounter();
});

function showCounter() {
    script.counter.text = "" + global.counter;
}

script.createEvent("UpdateEvent").bind(function (a) {

    dt = getDeltaTime();

    sec += dt;

    if (global.counter >= 5 && hasWon == false) {
        print("You made a receipe.");
        print(JSON.stringify(ingredients));
        print("TODO call ChatGPT API + show texte");
        script.GPTBoxBoard.enabled = true;
        promptController.api.build(ingredients);
        print("TODO call animation Pot + Gfx");
        script.potAnimationMixer.start("BaseLayer", 0, 1);
        hasWon = true;
    }

});


script.createEvent("TapEvent").bind(function (eventData) {
    // print("Tap Position: (" + eventData.getTapPosition().x + ", " + eventData.getTapPosition().y + ")");
    doRay(eventData.getTapPosition());
});


function doTap(obj) {

    // print(obj.name);
    if (!tapped) {

        items[item] = obj;
        moments[item] = sec;

        tapped = true;
        holding = obj;
        holding.setParentPreserveWorldTransform(camera.getSceneObject());
        holding.getTransform().setWorldPosition(camera.getTransform().getWorldPosition().add(camera.getTransform().back.uniformScale(70)).add(camera.getTransform().down.uniformScale(20)).add(camera.getTransform().right.uniformScale(20)));

        holding.getComponent("Physics.BodyComponent").dynamic = false;
    } else {
        tapped = false;
        script.debug.text = "";

        if (holding) {
            holding.setParentPreserveWorldTransform(script.scene);
            holding.getComponent("Physics.BodyComponent").dynamic = true;
            print(holding.name);
            print(holding.getComponents("Component.ScriptComponent")[1]);

            var component = holding.getComponents("Component.ScriptComponent")[1];
            if (component)
                component.api.dropped();

        }
    }

}

function doRay(screenPos) {
    // Create a probe to raycast through all worlds.
    var probe = Physics.createGlobalProbe();

    var objectLayer = script.getSceneObject().layer;
    // Set some properties on it.
    // probe.debugDrawEnabled = true;
    probe.filter.onlyLayers = probe.filter.onlyLayers.union(objectLayer);
    probe.filter.includeStatic = true;
    probe.filter.includeDynamic = true;
    probe.filter.includeIntangible = true;

    // Find the first hit.
    var rayStart = camera.getTransform().getWorldPosition();
    var rayEnd = camera.screenSpaceToWorldSpace(screenPos, 300);
    probe.rayCast(rayStart, rayEnd, function (hit) {

        if (hit === null) {
            print("no hit");
            tapped = false;
            script.debug.text = "";

            if (holding) {
                holding.setParentPreserveWorldTransform(script.scene);
                holding.getComponent("Physics.BodyComponent").dynamic = true;
            }
            return;
        }
        var obj = hit.collider.getSceneObject();

        print("hit collider: " + obj.name);

        if (obj.name.substring(0, 4) != "item") {
            tapped = false;
            script.debug.text = "";

            if (holding) {
                holding.setParentPreserveWorldTransform(script.scene);
                holding.getComponent("Physics.BodyComponent").dynamic = true;
            }
            return;
        }

        global.currentIngredient = obj;
        script.debug.text = "" + obj.name;

        doTap(obj);

        // print("skip remaining: " + hit.skipRemaining);
        // print("collider: " + hit.collider);
        // print("position: " + hit.position);
        // print("nortmal: " + hit.normal);
        // print("distance: " + hit.distance);
        // print("ray interpolant: " + hit.t);

        // Triangle hit information, available when a ray cast intersects a collision mesh.
        var tri = hit.triangle;
        if (tri) {
            // print("triangle: " + tri);
            // print("mesh: " + tri.mesh);
            // print("index: " + tri.index);
            // print("vertexIndices: " + tri.vertexIndices);
            // print("vertexPositions: " + tri.vertexPositions);
            // print("barycentricCoordinate: " + tri.barycentricCoordinate);
        }

        // Skip remaining hits past a certain distance.
        if (hit.distance > 350.0) {
            hit.skipRemaining = true;
        }
    });
}