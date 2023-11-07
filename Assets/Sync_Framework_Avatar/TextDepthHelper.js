// TextDepthHelper.js
// Version: 1.0.1
// Event: On Awake
// Description: Helps assign settings to make Text components use world space depth rendering.


// @input Component.Text text

// @input bool setRenderOrder
// @input int renderOrder = 9999 {"showIf":"setRenderOrder"}

var text = script.getSceneObject().getComponent("Component.Text");

if (text) {
    if (script.setRenderOrder) {
        text.setRenderOrder(script.renderOrder);
    }
}
