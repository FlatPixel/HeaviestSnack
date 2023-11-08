//@input Component.AnimationMixer potAnimationMixer

script.createEvent("TapEvent").bind(function (eventData) {
    script.potAnimationMixer.start("BaseLayer", 0, 1);
});