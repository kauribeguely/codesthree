// input-providers.js
// Shared. No platform or AR dependencies.

export function getMouseChannels(mouseVec2) {
    // mouseVec2 is the existing NDC -1..1 THREE.Vector2 already maintained in onMouseMove
    return {
        'mouseX': (mouseVec2.x + 1) / 2,
        'mouseY': (mouseVec2.y + 1) / 2,
    };
}

export function mergeChannels(...channelDicts) {
    return Object.assign({}, ...channelDicts);
}