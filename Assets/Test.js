//@input Component.ScriptComponent promptController
/** @type {ScriptComponent} */
var promptController = script.promptController;

var data = [
    {name:"fries"},
    {name:"marshmallow"},
    {name:"mushroom"},
    {name:"sardines"},
    {name:"greenPepper"},
    {name:"eggplant"},
    {name:"pineapple"},
    {name:"pepperoni"},
    {name:"redpepper"},
    {name:"candy"},
    {name:"olive"},
    {name:"onion"},
    {name:"chocolate"},
    {name:"ham"},
    {name:"anchovy"},
    {name:"cheese"},
    {name:"tomato"},
    {name:"sausage"},
    {name:"steak"},
    {name:"chili"},
    {name:"burger"},
    {name:"broccoli"}
]


script.createEvent("TouchStartEvent").bind(onTouchStart);

function onTouchStart(e){

    print("onTouchStart")
    promptController.api.build(data);

}