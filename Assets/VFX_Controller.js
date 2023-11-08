
//@ui {"widget":"group_start","label":"FIRE"}
//@input Component.VFXComponent fire_VFX
//@ui {"widget":"group_end"}


//@ui {"widget":"group_start","label":"CONFIRM"}
//@input Component.VFXComponent confirm_VFX
// @input float confirm_burst_duration = 0 {"label": "Confirm Burst Duration"}
//@ui {"widget":"group_end"}


//@ui {"widget":"group_start","label":"SMOKE"}
//@input Component.VFXComponent smoke_VFX
//@input Component.VFXComponent smoke_burst_VFX
// @input float smoke_burst_duration = 0 {"label": "Smoke Burst Duration"}
//@input bool smake_rim_active = false

//@ui {"widget":"group_end"}

//@ui {"widget":"group_start","label":"Colors"}
//@input vec4 color_0 {"widget":"color"}
//@input vec4 color_1 {"widget":"color"}
//@input vec4 color_2 {"widget":"color"}
//@input vec4 color_3 {"widget":"color"}
//@input vec4 color_4 {"widget":"color"}
//@ui {"widget":"group_end"}

var colorCounter = 0;
var colors = [
    script.color_0,
    script.color_1,
    script.color_2,
    script.color_3,
    script.color_4
];

/** @type {VFXComponent} */
var smoke_VFX = script.smoke_VFX;
var smoke_burst_VFX = script.smoke_burst_VFX;
var confirm_VFX = script.confirm_VFX;
var fire_VFX = script.fire_VFX;

/** @type {boolean} */
var smake_rim_active = script.smake_rim_active;

script.api.setFireStrength = setFireStrength
script.api.startSmoke = startSmoke
script.api.endSmoke = endSmoke
script.api.onLidOpened = onLidOpened
script.api.onIngredientAdded = onIngredientAdded

let confirm_burst_duration = script.confirm_burst_duration;
let smoke_burst_duration = script.smoke_burst_duration;
let smoke_rim_duration = script.smoke_rim_duration;

function setFireStrength() {

}

// Trigger on lit close
function startSmoke() {

    var burstDur = 1000 + getTime();

    // script.smoke_VFX.asset.properties["rim_active"] = true;
    script.smoke_VFX.asset.properties["burstDuration"] = burstDur;

}

// triggers on lit final opens
function endSmoke() {

    var burstDur = 0.1 + getTime();
    script.smoke_VFX.asset.properties["burstDuration"] = burstDur;
}

// triggers on lit final opens
function onLidOpened() {

    var burstDur = smoke_burst_duration + getTime();
    script.smoke_burst_VFX.asset.properties["burstDuration"] = burstDur;
}

/**
 * 
 * @method onIngredientAdded()
 * Triggers VFX ring every time an ingredient is succesfully added to cauldron
 */
function onIngredientAdded() {
    print("onIngredientAdded")
    var burstDur = smoke_burst_duration + getTime();

    var color = colors[colorCounter % colors.length];

    script.confirm_VFX.asset.properties["burstDuration"] = burstDur;
    script.confirm_VFX.asset.properties["startColor"] = color;
    script.confirm_VFX.asset.properties["endColor"] = color;

    colorCounter++;
}


///SIMULATE PLEASE DELETE
script.api.simulateAddIngredient = simulateAddIngredient;
function simulateAddIngredient() {
    var data = {
        name: "strawberry"
    }

    onIngredientAdded(data)
}

script.api.simulateOpeningLid = simulateOpeningLid;
function simulateOpeningLid() {

    onLidOpened()
}
/* 
script.createEvent("TouchStartEvent").bind(function(eventData){
    print("hallo")
    onIngredientAdded();
}); */