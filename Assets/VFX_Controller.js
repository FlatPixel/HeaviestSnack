
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
//@ui {"widget":"group_end"}



/** @type {VFXComponent} */
var smoke_VFX = script.smoke_VFX;
var confirm_VFX = script.confirm_VFX;
var fire_VFX = script.fire_VFX;



script.api.setFireStrength = setFireStrength
script.api.startSmoke = startSmoke
script.api.endSmoke = endSmoke
script.api.onLidOpened = onLidOpened
script.api.onIngredientAdded = onIngredientAdded

let confirm_burst_duration = script.confirm_burst_duration;
let smoke_burst_duration = script.smoke_burst_duration;

function setFireStrength(){

}

function startSmoke(){

}

function endSmoke(){
    
}

function onLidOpened(){
  
    var burstDur = smoke_burst_duration + getTime();

    print(burstDur)
    script.smoke_burst_VFX.asset.properties["burstDuration"] = burstDur;
}

/**
 * 
 * @method onIngredientAdded()
 * @param {Object} ingredientData
 * Triggers VFX ring every time an ingredient is succesfully added to cauldron
 */
function onIngredientAdded(ingredientData){
    // print("onIngredientAdded")
    var burstDur = smoke_burst_duration + getTime();

    script.confirm_VFX.asset.properties["burstDuration"] = burstDur;
    script.confirm_VFX.asset.properties["startColor"] = ingredientData.color;
    script.confirm_VFX.asset.properties["endColor"] = ingredientData.color;
}


///SIMULATE PLEASE DELETE
script.api.simulateAddIngredient = simulateAddIngredient;
function simulateAddIngredient(){
    var data = {
        name : "strawberry",
        color: new vec4(Math.random(),Math.random(),Math.random(),1)
    }

    onIngredientAdded(data)
}

script.api.simulateOpeningLid = simulateOpeningLid;
function simulateOpeningLid(){

    onLidOpened()
}