// hand-input-provider.js
// The ONLY file in this codebase allowed to import GestureEngine.
// Everything downstream sees plain numbers, never MediaPipe types.

export const LANDMARK_NAMES = [
    'WRIST',
    'THUMB_CMC', 'THUMB_MCP', 'THUMB_IP', 'THUMB_TIP',
    'INDEX_MCP', 'INDEX_PIP', 'INDEX_DIP', 'INDEX_TIP',
    'MIDDLE_MCP', 'MIDDLE_PIP', 'MIDDLE_DIP', 'MIDDLE_TIP',
    'RING_MCP', 'RING_PIP', 'RING_DIP', 'RING_TIP',
    'PINKY_MCP', 'PINKY_PIP', 'PINKY_DIP', 'PINKY_TIP',
];

// Matches "hand.left.distance.INDEX_TIP-THUMB_TIP" or "hand.right.distancePx.WRIST-MIDDLE_TIP"
const DISTANCE_KEY_RE = /^hand\.(left|right)\.distance(Px)?\.([A-Z_]+)-([A-Z_]+)$/;

export function parseDistanceChannelKey(key) {
    const match = DISTANCE_KEY_RE.exec(key);
    if (!match) return null;
    const [, hand, pxSuffix, landmarkA, landmarkB] = match;
    return { key, hand, pixels: pxSuffix === 'Px', landmarkA, landmarkB };
}

let gestureEngineLoadPromise = null;

function ensureGestureEngineLoaded(scriptUrl) {
    if (window.GestureEngine) return Promise.resolve();
    if (gestureEngineLoadPromise) return gestureEngineLoadPromise; // avoid double-injecting

    gestureEngineLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load GestureEngine from ${scriptUrl}`));
        document.head.appendChild(script);
    });
    return gestureEngineLoadPromise;
}

export class HandInputProvider {
    constructor() {
        this.engine = null;
        this.latestState = null;
        this.smoothed = {}; // channelKey -> last-known value, held across momentary hand loss
        this.activeDistanceChannels = []; // set via setActiveDistanceChannels(), scene-driven
    }

    async start(scriptUrl, options = {}) {
        await ensureGestureEngineLoaded(scriptUrl);
        this.engine = await GestureEngine.create({ debug: false, ...options });
        this.engine.onUpdate((state) => { this.latestState = state; });
    }

    dispose() {
        this.engine?.dispose();
        this.engine = null;
        this.latestState = null;
    }

    // Called by the scene engine whenever the set of objects / their animTriggerSource
    // values changes (object add/delete/duplicate, or trigger source edited in the UI).
    // Keeps the expensive landmark-pair distance calc scoped to only what's actually used,
    // instead of computing all ~210 pair combinations x 2 hands x 2 spaces every frame.
    setActiveDistanceChannels(channelKeys) {
        this.activeDistanceChannels = Array.from(new Set(channelKeys))
            .map(parseDistanceChannelKey)
            .filter(Boolean);
    }

    // Static so the picker (l) can list options without a live camera/engine.
    static describeChannels() {
        const metrics = [];
        for (const hand of ['left', 'right']) {
            for (const name of LANDMARK_NAMES) {
                metrics.push({ key: `hand.${hand}.landmark.${name}.nx`, label: `${hand} hand — ${name} (x)`, defaultMin: 0, defaultMax: 1 });
                metrics.push({ key: `hand.${hand}.landmark.${name}.ny`, label: `${hand} hand — ${name} (y)`, defaultMin: 0, defaultMax: 1 });
            }
            metrics.push({ key: `hand.${hand}.pinchDistance`, label: `${hand} hand — pinch distance (normalized)`, defaultMin: 0, defaultMax: 0.5 });
            metrics.push({ key: `hand.${hand}.pinchDistancePx`, label: `${hand} hand — pinch distance (raw pixels)`, defaultMin: 0, defaultMax: window.innerWidth ?? 1920, pixelSpace: true });
            metrics.push({ key: `hand.${hand}.rotation`, label: `${hand} hand — rotation`, defaultMin: -90, defaultMax: 90 });
            metrics.push({ key: `hand.${hand}.rotationThumbIndex`, label: `${hand} hand — thumb/index rotation`, defaultMin: -90, defaultMax: 90 });
            metrics.push({ key: `hand.${hand}.distance.{A}-{B}`, label: `${hand} hand — distance between two landmarks (normalized)`, needsLandmarkPair: true, landmarkOptions: LANDMARK_NAMES, defaultMin: 0, defaultMax: 1 });
            metrics.push({ key: `hand.${hand}.distancePx.{A}-{B}`, label: `${hand} hand — distance between two landmarks (raw pixels)`, needsLandmarkPair: true, landmarkOptions: LANDMARK_NAMES, defaultMin: 0, defaultMax: window.innerWidth ?? 1920, pixelSpace: true });
        }
        metrics.push({ key: 'hand.bothIndexesTouching', label: 'Both hands — indexes touching (0/1)', defaultMin: 0, defaultMax: 1 });
        metrics.push({ key: 'hand.indexTouchDistance', label: 'Both hands — index touch distance', defaultMin: 0, defaultMax: 1 });
        return metrics;
    }

    getChannels() {
        const state = this.latestState;
        const raw = {};

        for (const hand of ['left', 'right']) {
            const h = hand === 'left' ? state?.leftHand : state?.rightHand;
            if (!h?.exists) continue;

            for (const name of LANDMARK_NAMES) {
                const lm = h[name]; // named shortcut, per README: { x, y, nx, ny }
                if (!lm) continue;
                raw[`hand.${hand}.landmark.${name}.nx`] = lm.nx;
                raw[`hand.${hand}.landmark.${name}.ny`] = lm.ny;
            }

            raw[`hand.${hand}.pinchDistance`] = h.pinchDistance;
            raw[`hand.${hand}.pinchDistancePx`] = h.pinchDistancePx;
            raw[`hand.${hand}.rotation`] = h.rotation;
            raw[`hand.${hand}.rotationThumbIndex`] = h.rotationThumbIndex;
        }

        if (state?.leftHand?.exists && state?.rightHand?.exists) {
            raw['hand.bothIndexesTouching'] = state.global.bothIndexesTouching ? 1 : 0;
            raw['hand.indexTouchDistance'] = state.global.indexTouchDistance;
        }

        // Only resolve the landmark-pair distance channels actually referenced in the scene.
        for (const { key, hand, landmarkA, landmarkB, pixels } of this.activeDistanceChannels) {
            const h = hand === 'left' ? state?.leftHand : state?.rightHand;
            if (!h?.exists || !h[landmarkA] || !h[landmarkB]) continue;
            raw[key] = GestureEngine.utils.distanceBetween(h[landmarkA], h[landmarkB], {
                space: pixels ? 'pixels' : 'normalized',
            });
        }

        // Hold last-known value on momentary hand loss — no damping here, smoothing is owned
        // entirely by each object's existing animDamping in animate().
        for (const [key, val] of Object.entries(raw)) {
            if (val === undefined || val === null) continue;
            this.smoothed[key] = val;
        }
        return this.smoothed;
    }
}