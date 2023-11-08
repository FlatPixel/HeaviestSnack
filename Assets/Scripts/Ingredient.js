var obj = script.getSceneObject();

//@input int damage = 100
/** @type {number} */
var damage = script.damage;
//@input float countdown = 2
var countdown = script.countdown;
var timeBeforeValidating = countdown;

//@ui {"widget":"label","label":""}
//@input Component.RenderMeshVisual bombMesh;

//@ui {"widget":"label","label":""}
//@ui {"widget":"label","label":"Gfx"}
//@input Component.ScriptComponent gfx_explosion;
var timerExplosion = 0;
var hasExploded = false;

var physicsComponent;
var overlapingObject = null;

script.api.sharedBomb = false;

script.createEvent("OnStartEvent").bind(function (eventData) {
    physicsComponent = obj.getComponent("Physics.BodyComponent")
    if (physicsComponent === null) print("collider of the bomb wasn't found!");

    physicsComponent.overlapFilter.includeStatic = false;
    physicsComponent.overlapFilter.includeDynamic = false;
    physicsComponent.overlapFilter.includeIntangible = true;

    physicsComponent.onOverlapEnter.add(overlapEnter);
    physicsComponent.onOverlapStay.add(overlapStay);
    physicsComponent.onOverlapExit.add(overlapExit);

    physicsComponent.onCollisionEnter.add(collisionEnter);
});

script.createEvent("UpdateEvent").bind(function (eventData) {
    if (physicsComponent.dynamic) {
        timeBeforeValidating -= getDeltaTime();
        if (timeBeforeValidating <= 0 && hasExploded == false) {
            if (overlapingObject !== null && overlapingObject.collider.getSceneObject().name === "TriggerZone") {
                if (script.api.sharedBomb == false) {
                    // global.loseHealth(damage);
                    // global.gameController.localPlayerEndommagedBot(damage);
                }
                overlapingObject = null;
            }

            if (script.gfx_explosion)
                script.gfx_explosion.api.startParticleSystem();

            physicsComponent.dynamic = false;
            script.bombMesh.enabled = false;

            hasExploded = true;
        }
    }

    if (hasExploded) {
        timerExplosion += getDeltaTime();

        if (timerExplosion > 0.75) {
            obj.destroy();
        }
    }
});

function collisionEnter(e) {
}

function overlapEnter(e) {
    //    printOverlapEvent(e,"Enter");
    overlapingObject = e.overlap;
}

function overlapStay(e) {
    // printOverlapEvent(e,"Stay");
    overlapingObject = e.overlap;
}

function overlapExit(e) {
    // printOverlapEvent(e,"Exit");
    overlapingObject = null;
}

function printOverlapEvent(e, event) {
    var overlapCount = e.currentOverlapCount;
    if (overlapCount === 0) {
        return;
    }
    var overlap = e.overlap;
    print("[" + obj.name + "] Overlap" + event + ", collider= " + overlap.collider.getSceneObject().name);
}