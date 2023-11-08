

var sec = 0;
var lastpos = null;

var timer =0;

var physics = true;

script.api.dropped = function() {
    
    sec = 0;
    physics = true;
}

script.createEvent("UpdateEvent").bind(function(a){
    
    dt=getDeltaTime();
    
    sec+=dt;
    
  if (physics) {
        
        if (sec>4) {
            setPhysics(false);
            
        }
    }
    /*
    pos = script.getSceneObject().getTransform().getWorldPosition();
    
    if (lastpos == null) {
        lastpos = pos;
    }
    
    dist = lastpos.distance(pos);
    
    if (physics) {
        
        // is it still?
        if (dist<20) {
            
            sec+=dt;
            // still too long?
            
            if (sec >4) {
                setPhysics(false);
                timer=0.5;
            }
        }  else {
            
            // it moved, so reset sec measurement
            sec=0;
            
        }
        
    } else {    
        // no physics
        
        // time to check for movement again?
        if (timer<0) {
            timer = 0.5;
            // is there movement?
            
            if (dist>30) {
                
                setPhysics(true);
                sec=0;
                
            }
            
        }
    
    }
    
    */
    
});
    
function setPhysics(arg) {
    physics= arg;
    script.getSceneObject().getComponent("Physics.BodyComponent").dynamic = physics;
        
}