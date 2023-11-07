

//@input SceneObject cam

//@input SceneObject scene

//@input SceneObject cursor

var tapped = false;

var holding = null;

script.createEvent("UpdateEvent").bind(function(a){
    
    
    
    
});


script.createEvent("TapEvent").bind(function (t) {
    
    doRay();
    
});


function doTap(obj) {

    print(obj.name);
   if (!tapped) {
        
        tapped=true;
        holding = obj;
       holding.setParentPreserveWorldTransform(script.cam);

        holding.getComponent("Physics.BodyComponent").dynamic=false;
    } else {
        tapped=false;
         holding.setParentPreserveWorldTransform(script.scene);
 
        holding.getComponent("Physics.BodyComponent").dynamic=true;
  
    }    
    
}

function doRay() {
    
    print("ray");
    var rayStart = script.cam.getTransform().getWorldPosition();
   
    var rayEnd = script.cursor.getTransform().getWorldPosition();
    
    print(rayEnd);
    
    // Create a probe to raycast through all worlds.
    var probe = Physics.createGlobalProbe();
     
    // Set some properties on it.
    probe.debugDrawEnabled = true;
    probe.filter.includeStatic = true;
    probe.filter.includeDynamic = true;
    probe.filter.includeIntangible = true;
     
    // Find the first hit.
    probe.rayCast(rayStart, rayEnd, function (hit) {
    
        if(hit===null){
            print("no hit");
            return;
        }
        obj=hit.collider.getSceneObject();
        
        print("hit collider: " + obj);
    
        if (obj.name.substring(0,4) != "item") {
            return;
            
        }
        
        doTap(obj);
        
        print("skip remaining: " + hit.skipRemaining);
        print("collider: " + hit.collider);
        print("position: " + hit.position);
        print("nortmal: " + hit.normal);
        print("distance: " + hit.distance);
        print("ray interpolant: " + hit.t);
        
        // Triangle hit information, available when a ray cast intersects a collision mesh.
        var tri = hit.triangle;
        if (tri) {
            print("triangle: " + tri);
            print("mesh: " + tri.mesh);
            print("index: " + tri.index);
            print("vertexIndices: " + tri.vertexIndices);
            print("vertexPositions: " + tri.vertexPositions);
            print("barycentricCoordinate: " + tri.barycentricCoordinate);
        }
     
        // Skip remaining hits past a certain distance.
        if (hit.distance > 350.0) {
            hit.skipRemaining = true;
        }
    });
}

