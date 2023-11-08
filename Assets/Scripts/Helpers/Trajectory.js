// Create a probe to raycast through only the implicit root world.
var rootProbe = Physics.createRootProbe();
// @input Physics.WorldComponent world;

//print(script.world.worldSettings.gravity)
//print(Physics.getRootWorldSettings());

function CalculateTrajectory(start, end, velocity) {
    var dir = end.sub(start);
    var vSqr = velocity * velocity;
    var y = dir.y;
    dir.y = 0;
    var x = dir.sqrMagnitude;
    var g = -script.world.worldSettings.gravity;

    var uRoot = vSqr * vSqr - g * (g * (x) + (2.0 * y * vSqr));

    var angle = 0;
    // var highAngle = 0;
    if (uRoot < 0) {
        //target out of range.
        angle = -45.0;
        //highAngle = -45.0f;
        return angle;
    }

    //        var r = Mathf.Sqrt (uRoot);
    //        var bottom = g * Mathf.Sqrt (x);

    angle = -Mathf.Atan2(g * Mathf.Sqrt(x), vSqr + Mathf.Sqrt(uRoot)) * Mathf.Rad2Deg;
    //highAngle = -Mathf.Atan2 (bottom, vSqr - r) * Mathf.Rad2Deg;
    return angle;
}

global.GetTrajectoryVelocity = function (start, end, angle) {
    //    print("GetTrajectoryVelocity");
    // speed = sqrt((gravity.y*target.x^2)/(2*cos^2(angle)*(target.y - target.x*tan(angle)))
    var dir = end.sub(start).uniformScale(0.01);
    var dirZX = new vec2(end.x, end.z).sub(new vec2(start.x, start.z)).uniformScale(0.01);
    var y = dir.y;
    var x = dir.length;
    var g = script.world.worldSettings.gravity.uniformScale(0.01);
    var cosAngle = Math.cos(angle);

    //    print("end: " + end);
    //    print("angle: " + angle);
    //    print("dir: " + dir);
    //    print("y: " + y);
    //    print("x: " + x);
    //    print("cosAngle: " + cosAngle);

    var velocity = Math.sqrt((g.y * x * x) / (2 * cosAngle * cosAngle * (y - x * Math.tan(angle))));
    //    var velocity = x * -g.y / Math.sin(2 * angle);
    return velocity * 100;
}

global.GetTrajectoryVelocityByHeight = function (start, end, height) {
    start = start.uniformScale(0.01);
    end = end.uniformScale(0.01);
    height = height * 0.01;
    var g = script.world.worldSettings.gravity.uniformScale(0.01);

    var displacementY = end.y - start.y;
    var displacementXZ = new vec3(end.x - start.x, 0, end.z - start.z);

    var ballHeight = height;
    if (height <= displacementY) ballHeight = displacementY + height;

    var velocityY = vec3.up().uniformScale(Math.sqrt(-2 * g.y * ballHeight));
    var velocityXZ = displacementXZ.uniformScale(1 / (Math.sqrt(-2 * ballHeight / g.y) + Math.sqrt(2 * (displacementY - ballHeight) / g.y)));

    //    print("CalculateLaunchVelocity: " + (velocityY.add(velocityXZ)));
    return velocityY.add(velocityXZ).uniformScale(100);
}


global.GetBallisticPath = function (startPos, forward, velocity, timeResolution, maxTimeFlight) {
    // Convert from cm to meters
    startPos = startPos.uniformScale(0.01);
    velocity = velocity * 0.01;
    var g = script.world.worldSettings.gravity.uniformScale(0.01);

    var timeOfFlight = GetTimeOfFlight(velocity, quat.rotationFromTo(forward, vec3.up()).getAngle(), startPos.y, g);
    maxTimeFlight = Math.min(maxTimeFlight, timeOfFlight);

    var tabSize = parseInt(Math.ceil(maxTimeFlight / timeResolution));

    var timeResolution = timeOfFlight / tabSize;

    var positions = [];
    var velVector = forward.uniformScale(velocity);
    var index = 0;
    var curPosition = startPos;
    for (var t = 0.0; t < maxTimeFlight; t += timeResolution) {

        if (index >= tabSize)
            break;//rounding error using certain values for maxTimeFlight and timeResolution

        positions.push(curPosition);
        curPosition = curPosition.add(velVector.uniformScale(timeResolution));
        velVector = velVector.add(g.uniformScale(timeResolution));
        index++;
    }

    // Go back from m to cm
    for (var i = 0; i < positions.length; i++)
        positions[i] = positions[i].uniformScale(100);

    return positions;
}

function CheckBallisticPath(arc, lm) {
    var hit;
    for (var i = 1; i < arc.Length; i++) {
        rayCast(arc[i - 1], arc[i] - arc[i - 1], hit);
        if (hit != null && GameMaster.IsInLayerMask(hit.transform.gameObject.layer, lm))
            return false;

        //            if (Physics.Raycast (arc [i - 1], arc [i] - arc [i - 1], out hit, (arc [i] - arc [i - 1]).magnitude) && GameMaster.IsInLayerMask(hit.transform.gameObject.layer, lm)) {
        //                Debug.DrawRay (arc [i - 1], arc [i] - arc [i - 1], Color.red, 10f);
        //                return false;
        //            } else {
        //                Debug.DrawRay (arc [i - 1], arc [i] - arc [i - 1], Color.green, 10f);
        //            }
    }
    return true;
}

function GetHitPosition(startPos, forward, velocity) {
    var path = GetBallisticPath(startPos, forward, velocity, 0.35);
    var hit;
    for (var i = 1; i < path.Length; i++) {

        //Debug.DrawRay (path [i - 1], path [i] - path [i - 1], Color.red, 10f);
        rayCast(path[i - 1], path[i] - path[i - 1], hit);
        if (hit != null) {
            return hit.point;
        }
    }

    return Vector3.zero;
}


function CalculateMaxRange(velocity) {
    return (velocity * velocity) / -Physics.gravity.y;
}

function GetTimeOfFlight(vel, angle, height, g) {
    // t = [V₀ * sin(α) + √((V₀ * sin(α))² + 2 * g * h)] / g
    var angledVelocity = (vel) * Math.sin(angle);
    var result = (angledVelocity + Math.sqrt((angledVelocity * angledVelocity) + 2 * -g.y * height)) / -g.y;
    return result;
    //    return (200.0 * (vel * 0.01) * Math.sin (angle)) / g;
}