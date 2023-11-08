// ----------------------------------------------------------------------------
/**
 * 
 * @param {number[]} a 
 * @returns {vec3}
 */
function vec3FromArray(a) {
    return new vec3(a[0], a[1], a[2]);
}

// ----------------------------------------------------------------------------

/**
 * 
 * @param {vec3} v 
 * @returns {number[]}
 */
function vec3ToArray(v) {
    return [v.x, v.y, v.z];
}

// ----------------------------------------------------------------------------
/**
 * 
 * @param {number[]} a 
 * @returns {vec4}
 */
function vec4FromArray(a) {
    return new vec4(a[0], a[1], a[2], a[3]);
}

// ----------------------------------------------------------------------------
/**
 * 
 * @param {vec4} v 
 * @returns {number[]}
 */
function vec4ToArray(v) {
    return [v.x, v.y, v.z, v.w];
}

// ----------------------------------------------------------------------------
/**
 * 
 * @param {number[]} a 
 * @return {quat}
 */
function quatFromArray(a) {
    return new quat(a[0], a[1], a[2], a[3]);
}

// ----------------------------------------------------------------------------
/**
 * 
 * @param {quat} q
 * @returns {number[]}
 */
function quatToArray(q) {
    return [q.w, q.x, q.y, q.z];
}


global.vec3FromArray = vec3FromArray;
global.vec3ToArray = vec3ToArray;
global.vec4FromArray = vec4FromArray;
global.vec4ToArray = vec4ToArray;
global.quatFromArray = quatFromArray;
global.quatToArray = quatToArray;

///

/**
 * 
 * @param {Plan} plan 
 * @param {vec3=} localPos 
 * @param {quat=} localRot 
 * @param {vec3=} localScale 
 * @returns {Plan}
 */
function writeTransformPartsToPlan(plan, localPos, localRot, localScale) {
    plan = plan || {};
    if (localPos) {
        plan.pos = vec3ToArray(localPos);
    }
    if (localRot) {
        plan.rot = quatToArray(localRot);
    }
    if (localScale) {
        plan.scale = vec3ToArray(localScale);
    }
    return plan;
}

/**
 * 
 * @param {Plan} plan 
 * @param {Transform} transform 
 * @param {boolean=} skipPos 
 * @param {boolean=} skipRot 
 * @param {boolean=} skipScale 
 */
function writeTransformToPlan(plan, transform, skipPos, skipRot, skipScale) {
    var pos = skipPos ? null : transform.getLocalPosition();
    var rot = skipRot ? null : transform.getLocalRotation();
    var scale = skipScale ? null : transform.getLocalScale();
    return writeTransformPartsToPlan(plan, pos, rot, scale);
}

/**
 * 
 * @param {Plan} plan 
 * @returns {vec3?}
 */
function getLocalPosFromPlan(plan) {
    return plan.pos ? vec3FromArray(plan.pos) : null;
}

/**
 * 
 * @param {Plan} plan 
 * @returns {quat?}
 */
function getLocalRotFromPlan(plan) {
    return plan.rot ? quatFromArray(plan.rot) : null;
}

/**
 * 
 * @param {Plan} plan 
 * @returns {vec3?}
 */
function getLocalScaleFromPlan(plan) {
    return plan.scale ? vec3FromArray(plan.scale) : null;
}

/**
 * 
 * @param {Plan} plan 
 * @param {Transform} transform 
 */
function applyPlanToTransform(plan, transform) {
    if (!plan) {
        return;
    }
    var pos = getLocalPosFromPlan(plan);
    if (pos) {
        transform.setLocalPosition(pos);
    }
    var rot = getLocalRotFromPlan(plan);
    if (rot) {
        transform.setLocalRotation(rot);
    }
    var scale = getLocalScaleFromPlan(plan);
    if (scale) {
        transform.setLocalScale(scale);
    }
}

global.writeTransformPartsToPlan = writeTransformPartsToPlan;
global.writeTransformToPlan = writeTransformToPlan;
global.getLocalPosFromPlan = getLocalPosFromPlan;
global.getLocalRotFromPlan = getLocalRotFromPlan;
global.getLocalScaleFromPlan = getLocalScaleFromPlan;
global.applyPlanToTransform = applyPlanToTransform;