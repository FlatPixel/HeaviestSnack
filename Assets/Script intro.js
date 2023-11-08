

//@input SceneObject cam

var timer  =2;

script.getSceneObject().setParent(script.cam);

pos = new vec3(0,0,-30);

script.getSceneObject().getTransform().setLocalPosition(pos);
script.createEvent("UpdateEvent").bind(function(a){
    
   
    dt = getDeltaTime();
    
    if (timer>0) {
        
        timer -=dt;
        
        if (timer<0) {
            
            script.getSceneObject().enabled=false;
        }
        
    }
    
});