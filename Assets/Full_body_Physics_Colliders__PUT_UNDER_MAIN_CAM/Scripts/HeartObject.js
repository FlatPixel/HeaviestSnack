// HeartObject.js
// Version 0.1.0
// Event : onAwake
// Trigger heart object animition or destory heart object based
// on collision event or if the object is out of the camera view
//@input Component.Camera camera
//@input string colliderName
//@input vec3 scaleUpTarget
//@input float scaleUpDuration
//@input vec3 scaleDownTarget
//@input float scaleDownDuration
var obj = script.getSceneObject();
var body = obj.getComponent("Physics.BodyComponent");
var transform = obj.getTransform();
var delayedEvent = script.createEvent("DelayedCallbackEvent");

var startScaleUp = true;
var startScaleDown = false;

var timer = 0;
var scaleUpTimer  = 0;
var scaleDownTimer = 0;
var difference = new vec3(0,0,0);
var isAnimated = false;

//Destory object.
function destroyObject(){
    script.getSceneObject().destroy();
}

//Destory object after a delay. 
delayedEvent.bind(function(eventData)
{
    destroyObject();
});

//Trigger Scale Down animation and delayed callback event when collide with "Floor Plane" object.
body.onCollisionEnter.add(function(eventArgs) {
    var collision = eventArgs.collision;    
    if(collision.collider.getSceneObject().name ===script.colliderName){
        if(!isAnimated){
            scaleUpTimer = 0;
            startScaleDown = true;   
        }     
        body.intangible = true;  
        delayedEvent.reset(0.5);
    }    
});

//Destory object when out of camera view
script.createEvent("UpdateEvent").bind(function () {
    var position = transform.getWorldPosition();
    var screenPosition = script.camera.worldSpaceToScreenSpace(position);
    if(screenPosition.x<0 || screenPosition.y<0 || screenPosition.x>1 || screenPosition.y>1)
    {
        destroyObject();
    }
    if(startScaleUp){
        timer = 0;
        isAnimated = true;
        scaleUpTimer = script.scaleUpDuration;
    }
    if (timer <= scaleUpTimer ) {
        timer += getDeltaTime();
        scaleAnimation(timer, scaleUpTimer, script.scaleUpTarget);
    }else{
        scaleUpTimer = 0;
        isAnimated = false;
    }
    
    if(startScaleDown){
        timer = 0;
        scaleDownTimer = script.scaleDownDuration;
        isAnimated = true;
    }
    if (timer <= scaleDownTimer) {
        timer += getDeltaTime();
        scaleAnimation(timer,scaleDownTimer, script.scaleDownTarget);
    }else{
        scaleDownTimer = 0;
        isAnimated = false;
    }
});

function scaleAnimation(timer, duration, target){
 
    difference = target.sub(transform.getWorldScale());
    percent = timer / duration;
    transform.setWorldScale(transform.getWorldScale().add(difference.uniformScale(percent)));

}
