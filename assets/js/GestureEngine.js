/**
 * @fileoverview GestureEngine - A standalone, headless, self-starting MediaPipe hand tracking and gesture detection engine.
 * @version 1.0.0
 * 
 * Capabilities:
 * - Real-time hand tracking (up to 2 hands) using MediaPipe Tasks API.
 * - Persistent Live State management for both hands (isPinching, rotation, position).
 * - Active Zone checking (isHandInVolume) for 3D coordinate-based interactions.
 * - Self-starting initialization and webcam management.
 * - Per-hand parity (Left/Right) mapping.
 * 
 * Usage:
 * const engine = new GestureEngine(); // enables saved-gesture detection if GestureDetector is already loaded
 * // Or: const engine = new GestureEngine({ gestureDetector: true }); // auto-loads addons/GestureDetector.js
 * await engine.init();
 * engine.onUpdate((state) => { ... });
 * 
 * // Or, as a one-line convenience factory:
 * const engine = await GestureEngine.create({ debug: true });
 */
class GestureEngine {
    constructor(gestureJsonPathOrOptions = undefined, maybeOptions = undefined) {
        this.handLandmarker = null;
        this.video = null;
        this.lastVideoTime = -1;
        this.isRunning = false;
        this.onUpdateCallback = null;

        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.isExternalVideo = false;
        this.enableVideoPreview = false;
        this.showSmallVideoPreview = true;
        this.isDebug = false;
        this.debugPanelEnabled = false;
        this.debugLinesEnabled = false;
        this.debugPanel = null;

        // Overlay configuration
        this.overlayEnabled = true;
        this.overlayColor = 'black';
        this.overlayOpacity = 0.3;
        this.overlayElement = null;

        this.LANDMARKS = {
            WRIST: 0,
            THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
            INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
            MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
            RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
            PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
        };

        // Optional gesture detector
        // - Default behavior: if GestureDetector is already loaded, auto-enable saved gesture detection.
        // - Optional: pass { gestureDetector: true } to auto-load addons/GestureDetector.js (no extra script tag needed).
        // - Override JSON: new GestureEngine('path/to/gestures.json') or { gestureJsonPath: '...' }.
        // - Disable: new GestureEngine(null) / new GestureEngine(false) / { gestureDetector: false }.
        const options = (() => {
            if (gestureJsonPathOrOptions && typeof gestureJsonPathOrOptions === 'object') return gestureJsonPathOrOptions;
            if (maybeOptions && typeof maybeOptions === 'object') return maybeOptions;
            return {};
        })();

        const gestureJsonPath =
            (gestureJsonPathOrOptions && typeof gestureJsonPathOrOptions === 'object')
                ? options.gestureJsonPath
                : gestureJsonPathOrOptions;

        const gestureDetectionDisabled =
            gestureJsonPath === null ||
            gestureJsonPath === false ||
            options.gestureDetector === false;

        const gestureJsonPathResolved =
            (typeof gestureJsonPath === 'string' && gestureJsonPath.trim().length > 0)
                ? gestureJsonPath.trim()
                : (typeof options.gestureJsonPath === 'string' && options.gestureJsonPath.trim().length > 0)
                    ? options.gestureJsonPath.trim()
                    : 'addons/gestures.json';

        const detectorScriptUrl =
            (typeof options.gestureDetectorScript === 'string' && options.gestureDetectorScript.trim().length > 0)
                ? options.gestureDetectorScript.trim()
                : (options.gestureDetector === true ? 'addons/GestureDetector.js' : null);

        const detectorDebugScriptUrl =
            (typeof options.gestureDetectorDebugScript === 'string' && options.gestureDetectorDebugScript.trim().length > 0)
                ? options.gestureDetectorDebugScript.trim()
                : (options.gestureDetectorDebug === true ? 'addons/debug.js' : null);

        this.detectorConfig = {
            enabled: !gestureDetectionDisabled,
            gestureJsonPath: gestureJsonPathResolved,
            scriptUrl: detectorScriptUrl,
            debugScriptUrl: detectorDebugScriptUrl
        };

        const DetectorCtor = (typeof globalThis !== 'undefined') ? globalThis.GestureDetector : undefined;
        const detectorAvailable = typeof DetectorCtor === 'function';
        this.gestureDetector = (!gestureDetectionDisabled && detectorAvailable)
            ? new DetectorCtor(gestureJsonPathResolved)
            : null;

        // Persistent Live State
        this.liveState = {
            hands: [
                { exists: false, isPinching: false, isThumbDown: false, thumbDownDist: 0, isDoublePinch: false, lastPinchTime: 0, pinchDistance: 1.0, rotation: 0, rotationSigned: 0, rotationThumbIndex: 0, rotationThumbIndexSigned: 0, palmSide: 'unknown', position: { x: 0, y: 0, z: 0 }, handedness: 'None', landmarks: null },
                { exists: false, isPinching: false, isThumbDown: false, thumbDownDist: 0, isDoublePinch: false, lastPinchTime: 0, pinchDistance: 1.0, rotation: 0, rotationSigned: 0, rotationThumbIndex: 0, rotationThumbIndexSigned: 0, palmSide: 'unknown', position: { x: 0, y: 0, z: 0 }, handedness: 'None', landmarks: null }
            ],
            global: {
                bothIndexesTouching: false,
                indexTouchDistance: 1.0
            }
        };

        // Add getter properties for convenient left/right hand access
        Object.defineProperty(this.liveState, 'leftHand', {
            get: function () {
                return this.hands.find(hand => hand.handedness === 'Left');
            }
        });

        Object.defineProperty(this.liveState, 'rightHand', {
            get: function () {
                return this.hands.find(hand => hand.handedness === 'Right');
            }
        });

        this.debugColors = {
            cyan: '#00FFFF',
            orange: '#FFA500',
            magenta: '#FF00FF'
        };

        // Debug drawing configuration
        this.debugLineThickness = 0.5;
        this.debugDotSize = 2;
        this.debugLineBlur = 4;

        this.config = {
            clickThreshold: 0.45,
            touchThreshold: 0.45,
            thumbTouchThreshold: 0.8,
            width: window.innerWidth || 1280,
            height: window.innerHeight || 720
        };

        // Calibrated values storage
        this.calibratedValues = {
            clickThreshold: null,
            touchThreshold: null,
            thumbTouchThreshold: null
        };

        // Collected measurements for analysis
        this.collectedMeasurements = [];

        // Pinch event tracking
        this.previousPinchState = [false, false];
        this.pinchEventsEnabled = true;
    }

    /**
     * Convenience factory: creates a GestureEngine and awaits init() in one call.
     * Equivalent to:
     *   const engine = new GestureEngine(gestureJsonPathOrOptions);
     *   await engine.init(initOptions);
     * @param {Object} [initOptions] - Options forwarded to init(). Also used as constructor options
     *   if gestureJsonPathOrOptions is not separately provided.
     * @param {string|Object|null} [gestureJsonPathOrOptions] - Constructor arg (gesture JSON path or options object).
     * @returns {Promise<GestureEngine>}
     * @example
     * const engine = await GestureEngine.create({ debug: true });
     */
    static async create(initOptions = {}, gestureJsonPathOrOptions = undefined) {
        const engine = new GestureEngine(
            gestureJsonPathOrOptions !== undefined ? gestureJsonPathOrOptions : initOptions
        );
        await engine.init(initOptions);
        return engine;
    }

    /**
     * Initializes the MediaPipe HandLandmarker and starts the internal webcam.
     * @param {Object} options - Configuration options
     * @param {HTMLElement} [options.videoElement=null] - Existing video element to use
     * @param {HTMLElement} [options.canvasElement=null] - Existing canvas element to use
     * @param {number} [options.width=null] - Video width
     * @param {number} [options.height=null] - Video height
     * @param {boolean} [options.enableVideoPreview=true] - Enable video preview overlay
     * @param {boolean} [options.showSmallVideoPreview=true] - Show small video preview in corner
     * @param {'top-left'|'top-right'|'bottom-left'|'bottom-right'} [options.previewPosition='bottom-right'] - Corner for the small video preview
     * @param {boolean} [options.debug=false] - Enable debug panel and lines
     * @param {boolean} [options.debugLines=undefined] - Enable debug lines (overrides debug)
     * @param {boolean} [options.debugPanel=undefined] - Enable debug panel (overrides debug)
     * @param {boolean} [options.overlayEnabled=true] - Enable overlay on video
     * @param {string} [options.overlayColor='black'] - Overlay color
     * @param {number} [options.overlayOpacity=0.3] - Overlay opacity (0-1)
     */
    async init({ videoElement = null, canvasElement = null, width = null, height = null, enableVideoPreview = true, showSmallVideoPreview = true, previewPosition = 'bottom-right', debug = false, debugLines = undefined, debugPanel = undefined, overlayEnabled = true, overlayColor = 'black', overlayOpacity = 0.3 } = {}) {
        try {
            // Store instance reference for debug UI buttons
            window.gestureEngineInstance = this;

            // Initialize gesture detector if configured
            await this._ensureGestureDetector();
            if (this.gestureDetector) await this.gestureDetector.init();

            this.debugPanelEnabled = (typeof debugPanel === 'boolean') ? debugPanel : !!debug;
            this.debugLinesEnabled = (typeof debugLines === 'boolean') ? debugLines : !!debug;
            this.isDebug = this.debugPanelEnabled || this.debugLinesEnabled;
            if (this.debugPanelEnabled) this._initDebugUI();
            if (width) this.config.width = width;
            if (height) this.config.height = height;
            this.enableVideoPreview = enableVideoPreview;
            this.showSmallVideoPreview = showSmallVideoPreview;
            this.previewPosition = previewPosition;

            // Set overlay configuration
            this.overlayEnabled = overlayEnabled;
            this.overlayColor = overlayColor;
            this.overlayOpacity = Math.max(0, Math.min(1, overlayOpacity)); // Clamp between 0-1

            this.videoElement = videoElement || document.querySelector('.input_video') || null;
            this.canvasElement = canvasElement || document.querySelector('.output_canvas') || null;
            this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
            this.isExternalVideo = !!this.videoElement;

            if (!this.videoElement && (this.enableVideoPreview || this.showSmallVideoPreview)) {
                // create autofeed markup + overlay (visible feed by default for preview)
                this.videoElement = document.createElement('video');
                this.videoElement.className = 'input_video';
                // 'fixed' (not 'absolute') so the preview stays pinned to the viewport corner
                // regardless of page scroll - matches the fullscreen canvas below.
                this.videoElement.style.position = 'fixed';
                // this.videoElement.style.zIndex = '1';
                this.videoElement.style.width = '500px';
                // this.videoElement.style.height = '240px';
                // this.videoElement.style.zIndex = '1000';
                // this.videoElement.style.border = `2px solid ${this.debugColors.cyan}`;
                this.videoElement.style.display = 'none';
                this.videoElement.style.transform = 'scale(-1, 1)';
                this._applyPreviewPosition();

                this.videoElement.setAttribute('playsinline', '');
                this.videoElement.setAttribute('autoplay', '');
                this.videoElement.muted = true;
                document.body.appendChild(this.videoElement);

                this.canvasElement = this.canvasElement || document.createElement('canvas');
                this.canvasElement.className = 'output_canvas';
                this.canvasElement.style.position = 'fixed';
                this.canvasElement.style.top = '0';
                this.canvasElement.style.left = '0';
                this.canvasElement.style.width = '100vw';
                this.canvasElement.style.height = '100vh';
                this.canvasElement.style.pointerEvents = 'none';
                this.canvasElement.style.zIndex = '-1';
                this.canvasElement.style.transform = 'scale(-1, 1)';

                document.body.appendChild(this.canvasElement);
                this.canvasCtx = this.canvasElement.getContext('2d');
            }

            this.canvasElement = canvasElement || document.querySelector('.output_canvas') || null;
            if (this.videoElement && this.showSmallVideoPreview) {
                this.videoElement.style.display = 'block';
                this.videoElement.style.visibility = 'visible';
            }
            if (this.enableVideoPreview && this.canvasElement) {
                this.canvasElement.style.display = 'block';
                this.canvasElement.style.visibility = 'visible';
            }
            this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;
            this.isExternalVideo = !!this.videoElement;

            // Dynamically load MediaPipe Tasks Vision
            // We use the ES module version of Tasks Vision
            const visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest");
            const HandLandmarker = visionModule.HandLandmarker;
            const FilesetResolver = visionModule.FilesetResolver;

            window.HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS;

            // Inject drawing_utils.js if not already present (required for "everything required" mandate)
            if (!window.drawConnectors && !document.querySelector('script[src*="drawing_utils"]')) {
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";
                script.crossOrigin = "anonymous";
                document.head.appendChild(script);
                await new Promise(resolve => script.onload = resolve);
            }

            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 2,
                minHandDetectionConfidence: 0.7,
                minHandPresenceConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            await this._initVideo();
            this.isRunning = true;

            // Add resize handler for zoom-to-fill behavior
            this._handleResize = () => {
                if (this.canvasElement) {
                    this.canvasElement.width = window.innerWidth;
                    this.canvasElement.height = window.innerHeight;
                    // Clear video transform so it gets recalculated on next render
                    this._videoTransform = null;
                }
            };
            window.addEventListener('resize', this._handleResize);

            this._loop();
            console.log("GestureEngine: Initialized successfully with MediaPipe loader.");
        } catch (error) {
            console.error("GestureEngine: Initialization failed:", error);
        }
    }

    async _loadScriptOnce(src) {
        if (!src || typeof document === 'undefined') return;

        const api = (typeof globalThis !== 'undefined') ? globalThis : window;
        api.__GestureEngineScriptPromises = api.__GestureEngineScriptPromises || {};

        if (api.__GestureEngineScriptPromises[src]) {
            await api.__GestureEngineScriptPromises[src];
            return;
        }

        api.__GestureEngineScriptPromises[src] = new Promise((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.defer = true;
                script.crossOrigin = 'anonymous';
                script.dataset.gestureengine = '1';
                script.dataset.gestureengineSrc = src;
                script.onload = () => resolve(true);
                script.onerror = (e) => reject(e);
                document.head.appendChild(script);
            } catch (e) {
                reject(e);
            }
        });

        await api.__GestureEngineScriptPromises[src];
    }

    async _ensureGestureDetector() {
        if (!this.detectorConfig || !this.detectorConfig.enabled) return;

        const api = (typeof globalThis !== 'undefined') ? globalThis : window;

        if (!this.gestureDetector) {
            if (typeof api.GestureDetector !== 'function' && this.detectorConfig.scriptUrl) {
                await this._loadScriptOnce(this.detectorConfig.scriptUrl);
            }

            if (typeof api.GestureDetector === 'function') {
                this.gestureDetector = new api.GestureDetector(this.detectorConfig.gestureJsonPath);
            }
        }

        if (this.detectorConfig.debugScriptUrl) {
            await this._loadScriptOnce(this.detectorConfig.debugScriptUrl);
            try {
                if (api.GestureDetectorDebug && typeof api.GestureDetectorDebug.install === 'function') {
                    api.GestureDetectorDebug.install(api.GestureDetector);
                }
            } catch (e) { }
        }
    }

    async _initVideo() {
        // 1. Assign the target video element
        this.video = this.videoElement || document.createElement('video');
        this.video.setAttribute('autoplay', '');
        this.video.setAttribute('playsinline', '');
        this.video.muted = true;

        if (!this.video.srcObject && !this.video.src) {
            try {
                const constraints = {
                    video: { width: this.config.width, height: this.config.height }
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.video.srcObject = stream;
            } catch (err) {
                console.error("GestureEngine: Webcam access denied or unavailable.", err);
                return; // Stop here if user denies camera
            }
        }

        return new Promise((resolve) => {
            const onReady = () => {
                this.video.play().catch(err => console.warn('GestureEngine: Play error', err));
                if (this.canvasElement) {
                    this.canvasElement.width = this.video.videoWidth || this.config.width;
                    this.canvasElement.height = this.video.videoHeight || this.config.height;
                }
                resolve();
            };

            // If it's already loaded, run immediately, otherwise wait for event
            if (this.video.readyState >= 2) {
                onReady();
            } else {
                this.video.onloadedmetadata = onReady;
            }
        });
    }

    _initDebugUI() {
        this.debugPanel = document.createElement('div');
        this.debugPanel.style.position = 'absolute';
        this.debugPanel.style.top = '10px';
        this.debugPanel.style.right = '10px';
        this.debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.debugPanel.style.color = this.debugColors.cyan;
        this.debugPanel.style.padding = '15px';
        this.debugPanel.style.fontFamily = 'monospace';
        this.debugPanel.style.fontSize = '14px';
        this.debugPanel.style.borderRadius = '8px';
        this.debugPanel.style.zIndex = '9999';
        // this.debugPanel.style.pointerEvents = 'none'; // Lets you click through it
        document.body.appendChild(this.debugPanel);
    }

    _updateDebugUI() {
        if (!this.debugPanelEnabled || !this.debugPanel) return;

        let html = '<h3 style="margin:0 0 10px 0; color:white;">Engine Debug</h3>';
        html += `<div style="color:#aaa; font-size:12px; margin-bottom:8px;">`;
        html += `clickThreshold: <span style="color:${this.debugColors.magenta};">${this.config.clickThreshold}</span> | `;
        html += `touchThreshold: <span style="color:${this.debugColors.magenta};">${this.config.touchThreshold}</span> | `;
        html += `thumbTouchThreshold: <span style="color:${this.debugColors.magenta};">${this.config.thumbTouchThreshold}</span>`;
        html += `</div>`;

        this.liveState.hands.forEach((hand, index) => {
            html += `<div style="margin-bottom:10px; padding:8px; border:1px solid rgba(255,255,255,0.15); border-radius:6px;">`;
            html += `<b>Hand ${index}</b> `;
            html += `<span style="color:#888;">(${hand.handedness}${typeof hand.isPhysicalLeft === 'boolean' ? `, physicalLeft=${hand.isPhysicalLeft}` : ''}${hand.palmSide ? `, side=${hand.palmSide}` : ''})</span><br>`;

            if (hand.exists) {
                html += `position: <span style="color:${this.debugColors.magenta};">${hand.position.x.toFixed(0)}, ${hand.position.y.toFixed(0)}</span> | z: <span style="color:${this.debugColors.magenta};">${(hand.position.z ?? 0).toFixed(3)}</span><br>`;
                html += `palmSide: <span style="color:${hand.palmSide === 'front' ? this.debugColors.cyan : (hand.palmSide === 'back' ? this.debugColors.orange : '#888')}">${hand.palmSide || 'unknown'}</span><br>`;
                html += `rotation(wrist->midMiddleRing): <span style="color:${this.debugColors.magenta};">${hand.rotation.toFixed(1)} deg</span> | `;
                html += `rotationThumbIndex(thumbTip->indexTip): <span style="color:${this.debugColors.magenta};">${(hand.rotationThumbIndex ?? 0).toFixed(1)} deg</span><br>`;

                html += `isPinching: <span style="color:${hand.isPinching ? this.debugColors.cyan : this.debugColors.orange}">${hand.isPinching}</span> | `;
                html += `isDoublePinch: <span style="color:${hand.isDoublePinch ? this.debugColors.cyan : this.debugColors.orange}">${hand.isDoublePinch}</span> | `;
                html += `isThumbDown: <span style="color:${hand.isThumbDown ? this.debugColors.cyan : this.debugColors.orange}">${hand.isThumbDown}</span><br>`;

                // Store raw distances for display (calculate them again for display purposes)
                const landmarks = hand.landmarks;
                if (landmarks && landmarks.length >= 21) {
                    // Calculate hand size
                    const wristToThumbBase = Math.hypot(
                        landmarks[0].x - landmarks[1].x,
                        landmarks[0].y - landmarks[1].y,
                        (landmarks[0].z || 0) - (landmarks[1].z || 0)
                    );
                    const wristToPinkyBase = Math.hypot(
                        landmarks[0].x - landmarks[17].x,
                        landmarks[0].y - landmarks[17].y,
                        (landmarks[0].z || 0) - (landmarks[17].z || 0)
                    );
                    const thumbMCPToDIP = Math.hypot(
                        landmarks[2].x - landmarks[3].x,
                        landmarks[2].y - landmarks[3].y,
                        (landmarks[2].z || 0) - (landmarks[3].z || 0)
                    );
                    const handSize = (wristToThumbBase + wristToPinkyBase + thumbMCPToDIP) / 3;

                    // Raw pinch distance
                    const thumbTip = landmarks[4];
                    const indexTip = landmarks[8];
                    const rawPinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y, (thumbTip.z || 0) - (indexTip.z || 0));

                    // Raw thumb down distance
                    const thumbTip4 = landmarks[4];
                    const indexMCP5 = landmarks[5];
                    const rawThumbDownDist = Math.hypot(thumbTip4.x - indexMCP5.x, thumbTip4.y - indexMCP5.y, (thumbTip4.z || 0) - (indexMCP5.z || 0));

                    html += `pinchDistance: <span style="color:${this.debugColors.magenta};">${hand.pinchDistance.toFixed(4)}</span> (raw: ${rawPinchDist.toFixed(4)})<br>`;
                    html += `thumbDownDist: <span style="color:${this.debugColors.magenta};">${hand.thumbDownDist.toFixed(4)}</span> (raw: ${rawThumbDownDist.toFixed(4)})<br>`;

                    html += `handSize: ${handSize.toFixed(4)} | landmarks: ${landmarks.length}<br>`;
                    html += `lastPinchTime: <span style="color:#888;">${hand.lastPinchTime || 0}</span><br>`;
                } else {
                    html += `<span style="color:#888;">landmarks: none</span><br>`;
                }
            } else {
                html += `<i style="color:#888;">No hand detected</i><br>`;
            }

            html += `</div>`;
        });

        // Show dual-hand index touch distance
        if (this.liveState.hands[0].exists && this.liveState.hands[1].exists) {
            html += `<b>Dual Hand</b><br>`;
            html += `bothIndexesTouching: <span style="color:${this.liveState.global.bothIndexesTouching ? this.debugColors.cyan : this.debugColors.orange}">${this.liveState.global.bothIndexesTouching}</span><br>`;

            // Raw index distance
            const index1 = this.liveState.hands[0].landmarks[8];
            const index2 = this.liveState.hands[1].landmarks[8];
            const rawIndexDist = Math.hypot(index1.x - index2.x, index1.y - index2.y, (index1.z || 0) - (index2.z || 0));

            html += `indexTouchDistance: <span style="color:${this.debugColors.magenta};">${this.liveState.global.indexTouchDistance.toFixed(4)}</span> (raw: ${rawIndexDist.toFixed(4)})<br>`;
            const handDistPx = this.getDistanceBetweenHands();
            if (typeof handDistPx === 'number') {
                html += `distanceBetweenHands(px): <span style="color:${this.debugColors.magenta};">${handDistPx.toFixed(0)}</span><br>`;
            }
        }

        // Add gesture detector debug info if available (optional extension in addons/debug.js)
        if (this.gestureDetector && typeof this.gestureDetector.getDebugHtml === 'function') {
            html += `<div style="background:rgba(50,0,50,0.25); padding:10px; margin-top:10px; border-radius:4px; border:1px solid ${this.debugColors.magenta};">`;
            html += this.gestureDetector.getDebugHtml();
            html += `</div>`;
        } else if (this.gestureDetector) {
            html += `<div style="background:rgba(50,0,50,0.25); padding:10px; margin-top:10px; border-radius:4px; border:1px solid ${this.debugColors.magenta}; color:#aaa;">`;
            html += `<b style="color:${this.debugColors.magenta};">GestureDetector</b><br>`;
            html += `<i>Debug UI not installed.</i> Include <span style="color:${this.debugColors.magenta};">addons/debug.js</span> to add getDebugHtml().`;
            html += `</div>`;
        }

        if (!this.liveState.hands[0].exists && !this.liveState.hands[1].exists) {
            html += "<i>No hands detected</i>";
        }

        this.debugPanel.innerHTML = html;
    }

    printMeasurement(label, normalized, raw) {
        const entry = `${label}: ${normalized.toFixed(4)} (raw: ${raw.toFixed(4)})`;
        this.collectedMeasurements.push(entry);
        console.log(`Added: ${entry}`);
    }

    copyColl() {
        const text = this.collectedMeasurements.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            console.log('Measurements copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    /**
     * Cleanup method to stop the engine and remove event listeners
     */
    dispose() {
        this.isRunning = false;

        // Remove resize event listener
        if (this._handleResize) {
            window.removeEventListener('resize', this._handleResize);
            this._handleResize = null;
        }

        // Stop video stream
        if (this.video && this.video.srcObject) {
            const stream = this.video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }

        console.log("GestureEngine: Disposed successfully.");
    }

    /**
     * Get the top detected gesture for a hand
     * @param {number} handIndex - 0 for left, 1 for right
     * @returns {Object|null} Top match { name, similarity } or null
     */
    getDetectedGesture(handIndex) {
        if (!this.gestureDetector) return null;
        if (handIndex === 0) return this.gestureDetector.lastDetectionResults.lastLeftMatch;
        if (handIndex === 1) return this.gestureDetector.lastDetectionResults.lastRightMatch;
        return null;
    }

    /**
     * Get all detected gestures for a hand
     * @param {number} handIndex - 0 for left, 1 for right
     * @returns {Array} Array of matches [{ name, similarity }, ...]
     */
    getDetectedGestures(handIndex) {
        if (!this.gestureDetector) return [];
        if (handIndex === 0) return this.gestureDetector.lastDetectionResults.leftHand;
        if (handIndex === 1) return this.gestureDetector.lastDetectionResults.rightHand;
        return [];
    }

    /**
     * Get palm side ("front"|"back"|"unknown") for a hand.
     * @param {number} handIndex - Index of the hand (0 or 1).
     */
    getHandSide(handIndex) {
        const hand = this.liveState?.hands?.[handIndex];
        return hand?.palmSide || 'unknown';
    }

    /**
     * Get palm sides for both hands.
     * @returns {string[]} Array like ["front"|"back"|"unknown", ...]
     */
    getHandSides() {
        return [this.getHandSide(0), this.getHandSide(1)];
    }

    /**
     * Alias: get palm side ("front"|"back"|"unknown") for a hand.
     * @param {number} handIndex - Index of the hand (0 or 1).
     */
    getPalmSide(handIndex) {
        return this.getHandSide(handIndex);
    }

    /**
     * Alias: get palm sides for both hands.
     * @returns {string[]} Array like ["front"|"back"|"unknown", ...]
     */
    getPalmSides() {
        return this.getHandSides();
    }

    _getPalmSide(handedness, landmarks) {
        if (!landmarks || landmarks.length < 18) return 'unknown';

        // MediaPipe doesn't provide a palm/back-of-hand flag directly.
        // Heuristic requested: compare thumb vs pinky horizontal ordering.
        // Using MCP points makes it less sensitive to pinching/curling.
        const thumbMCP = landmarks[2];
        const pinkyMCP = landmarks[17];
        if (!thumbMCP || !pinkyMCP) return 'unknown';

        // Landmarks passed into this function are already mirrored in _processResults (x = 1 - x),
        // so comparisons here match the on-screen (DOM) left/right that the user sees.
        const thumbRightOfPinky = (thumbMCP.x > pinkyMCP.x);
        const isLeft = handedness === 'Left';

        // Rule:
        // - Left hand: thumb to the right => front
        // - Right hand: thumb to the right => back
        const palmFront = isLeft ? thumbRightOfPinky : !thumbRightOfPinky;
        return palmFront ? 'front' : 'back';
    }

    _loop() {
        if (!this.isRunning) return;

        const startTimeMs = performance.now();
        if (this.lastVideoTime !== this.video.currentTime) {
            this.lastVideoTime = this.video.currentTime;
            const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
            this._processResults(results);
            this._renderOverlay(results);
        }

        requestAnimationFrame(() => this._loop());
    }

    /**
     * Converts a normalized (mirrored) landmark point into current pixel space,
     * using the same zoom-to-fill math as `hand.position`. Falls back to raw
     * viewport dimensions if the video transform hasn't been computed yet
     * (e.g. on the very first tracked frame).
     * @param {{x:number, y:number}} landmark - Normalized, mirrored landmark point.
     * @returns {{x:number, y:number}} Pixel-space point.
     */
    _landmarkToPixel(landmark) {
        // landmark.x is already mirrored (see `landmarks = rawLandmarks.map(...)` in _processResults),
        // so it already matches true physical DOM coordinates - do NOT invert again here.
        // (This is a different coordinate space than _renderOverlay's internal landmarkToCanvas,
        // which intentionally un-mirrors back to raw camera space to align with the raw video frame
        // drawImage() copies onto the canvas; that canvas is then mirrored as a whole via CSS.)
        if (this._videoTransform) {
            const { offsetX, offsetY, drawWidth, drawHeight } = this._videoTransform;
            return {
                x: offsetX + landmark.x * drawWidth,
                y: offsetY + landmark.y * drawHeight
            };
        }
        return {
            x: landmark.x * window.innerWidth,
            y: landmark.y * window.innerHeight
        };
    }

    _processResults(results) {
        // Reset state for non-detected hands
        this.liveState.hands.forEach(h => h.exists = false);

        if (results.landmarks && results.landmarks.length > 0) {
            results.landmarks.forEach((rawLandmarks, index) => {
                const handedness = results.handednesses[index][0].categoryName; // "Left" or "Right"
                // MediaPipe Tasks usually returns the corrected handedness.
                const isPhysicalLeft = handedness === 'Left';
                const handIndex = index; // We map them as they come for simplicity, but script.js might need specific logic

                // Mirror the X coordinate for all landmarks to align with true physical DOM coordinates
                const landmarks = rawLandmarks.map(lm => ({ ...lm, x: 1 - lm.x }));

                const state = this.liveState.hands[index];

                state.exists = true;
                state.isPhysicalLeft = isPhysicalLeft;
                state.handedness = handedness;
                state.landmarks = landmarks;

                // Named per-landmark access, e.g. hand.INDEX_TIP.x/.y (pixel space) and .nx/.ny (normalized 0-1).
                // Kept in sync with `landmarks[]`/`LANDMARKS` above - same underlying points, just addressed by name.
                Object.keys(this.LANDMARKS).forEach(name => {
                    const lm = landmarks[this.LANDMARKS[name]];
                    if (!lm) return;
                    const px = this._landmarkToPixel(lm);
                    state[name] = { x: px.x, y: px.y, nx: lm.x, ny: lm.y };
                });

                // Calculate hand size for normalized detection (independent of camera distance)
                // Average of wrist-to-thumb-base and wrist-to-pinky-base and thumb-MCP-to-thumb-DIP distances
                const wristToThumbBase = Math.hypot(
                    landmarks[0].x - landmarks[1].x,
                    landmarks[0].y - landmarks[1].y,
                    (landmarks[0].z || 0) - (landmarks[1].z || 0)
                );
                const wristToPinkyBase = Math.hypot(
                    landmarks[0].x - landmarks[17].x,
                    landmarks[0].y - landmarks[17].y,
                    (landmarks[0].z || 0) - (landmarks[17].z || 0)
                );
                // Thumb MCP (2) to Thumb DIP (3) - helps offset y-rotation fluctuations
                const thumbMCPToDIP = Math.hypot(
                    landmarks[2].x - landmarks[3].x,
                    landmarks[2].y - landmarks[3].y,
                    (landmarks[2].z || 0) - (landmarks[3].z || 0)
                );
                const handSize = (wristToThumbBase + wristToPinkyBase + thumbMCPToDIP) / 3;

                // Position (Midpoint of Thumb Tip and Index Tip for accurate interaction)
                const thumbTip = landmarks[4];
                const indexTip = landmarks[8];

                // Z reference: average of Wrist (0), Index MCP (5), Pinky MCP (17)
                // This is more stable than tip-based Z and better represents hand depth.
                const wristLm = landmarks[0];
                const indexMCPLm = landmarks[5];
                const pinkyMCPLm = landmarks[17];
                const zVals = [wristLm?.z, indexMCPLm?.z, pinkyMCPLm?.z].filter(v => Number.isFinite(v));
                const zAvg = zVals.length > 0 ? (zVals.reduce((a, b) => a + b, 0) / zVals.length) : 0;
                // Calculate position accounting for zoom-to-fill transformation
                const midX = (thumbTip.x + indexTip.x) / 2;
                const midY = (thumbTip.y + indexTip.y) / 2;

                // midX/midY are already mirrored (derived from `landmarks`, which was mirrored
                // above) - do not invert again here. See _landmarkToPixel for the same fix.
                if (this._videoTransform) {
                    const { offsetX, offsetY, drawWidth, drawHeight } = this._videoTransform;
                    state.position = {
                        x: offsetX + midX * drawWidth,
                        y: offsetY + midY * drawHeight,
                        z: zAvg
                    };
                } else {
                    // Fallback to original behavior if transform not available
                    state.position = {
                        x: midX * window.innerWidth,
                        y: midY * window.innerHeight,
                        z: zAvg
                    };
                }

                // Pinch detection (Thumb 4 -> Index 8) - normalized by hand size
                const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y, (thumbTip.z || 0) - (indexTip.z || 0));
                const normalizedPinchDist = handSize > 0 ? pinchDist / handSize : pinchDist;
                state.pinchDistance = normalizedPinchDist;

                const isPinchingNow = normalizedPinchDist < this.config.clickThreshold;
                if (isPinchingNow && !state.isPinching) {
                    const now = Date.now();
                    state.isDoublePinch = (now - state.lastPinchTime < 400);
                    state.lastPinchTime = now;
                } else if (!isPinchingNow) {
                    state.isDoublePinch = false;
                }
                state.isPinching = isPinchingNow;

                // Thumb Down detection (Thumb Tip 4 -> Index Knuckle 5) - normalized by hand size
                const thumbTip4 = landmarks[4];
                const indexMCP5 = landmarks[5];

                const thumbDownDist = Math.hypot(thumbTip4.x - indexMCP5.x, thumbTip4.y - indexMCP5.y, (thumbTip4.z || 0) - (indexMCP5.z || 0));
                const normalizedThumbDownDist = handSize > 0 ? thumbDownDist / handSize : thumbDownDist;

                state.thumbDownDist = normalizedThumbDownDist;
                state.isThumbDown = normalizedThumbDownDist < this.config.thumbTouchThreshold;

                // Rotation (Wrist 0 -> Midpoint between Middle MCP 9 and Ring MCP 13)
                const wrist = landmarks[0];
                const middleMCP = landmarks[9];
                const ringMCP = landmarks[13];

                // Calculate midpoint between middle and ring finger bases
                const midPoint = {
                    x: (middleMCP.x + ringMCP.x) / 2,
                    y: (middleMCP.y + ringMCP.y) / 2
                };

                const dy = midPoint.y - wrist.y;
                const dx = midPoint.x - wrist.x;
                let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                angle = (angle + 90 + 360) % 360; // Upward hand = 0deg (was 270deg)
                state.rotation = angle;
                // Signed variant (-180..180, 0deg = up) - use this instead of `rotation` when
                // mapping to a continuous range that crosses 0deg (e.g. -30..30), since `rotation`
                // wraps from 359 back to 0 at that boundary and breaks a naive linear map().
                state.rotationSigned = angle > 180 ? angle - 360 : angle;

                // Rotation 2 (Thumb Tip 4 -> Index Tip 8)
                const dy2 = indexTip.y - thumbTip.y;
                const dx2 = indexTip.x - thumbTip.x;
                let angle2 = Math.atan2(dy2, dx2) * (180 / Math.PI);
                angle2 = (angle2 + 90 + 360) % 360; // Upward vector = 0deg (was 270deg)
                state.rotationThumbIndex = angle2;
                state.rotationThumbIndexSigned = angle2 > 180 ? angle2 - 360 : angle2;

                // Front/back (palm vs back of hand) heuristic
                state.palmSide = this._getPalmSide(state.handedness, landmarks);
            });

            // Global Combinatorial Logic (Dual Hand)
            if (results.landmarks.length === 2) {
                const index1 = results.landmarks[0][8];
                const index2 = results.landmarks[1][8];

                // Calculate hand sizes for both hands
                const handSize1 = (() => {
                    const wristToThumb = Math.hypot(
                        results.landmarks[0][0].x - results.landmarks[0][1].x,
                        results.landmarks[0][0].y - results.landmarks[0][1].y,
                        (results.landmarks[0][0].z || 0) - (results.landmarks[0][1].z || 0)
                    );
                    const wristToPinky = Math.hypot(
                        results.landmarks[0][0].x - results.landmarks[0][17].x,
                        results.landmarks[0][0].y - results.landmarks[0][17].y,
                        (results.landmarks[0][0].z || 0) - (results.landmarks[0][17].z || 0)
                    );
                    const thumbMCPToDIP = Math.hypot(
                        results.landmarks[0][2].x - results.landmarks[0][3].x,
                        results.landmarks[0][2].y - results.landmarks[0][3].y,
                        (results.landmarks[0][2].z || 0) - (results.landmarks[0][3].z || 0)
                    );
                    return (wristToThumb + wristToPinky + thumbMCPToDIP) / 3;
                })();

                const handSize2 = (() => {
                    const wristToThumb = Math.hypot(
                        results.landmarks[1][0].x - results.landmarks[1][1].x,
                        results.landmarks[1][0].y - results.landmarks[1][1].y,
                        (results.landmarks[1][0].z || 0) - (results.landmarks[1][1].z || 0)
                    );
                    const wristToPinky = Math.hypot(
                        results.landmarks[1][0].x - results.landmarks[1][17].x,
                        results.landmarks[1][0].y - results.landmarks[1][17].y,
                        (results.landmarks[1][0].z || 0) - (results.landmarks[1][17].z || 0)
                    );
                    const thumbMCPToDIP = Math.hypot(
                        results.landmarks[1][2].x - results.landmarks[1][3].x,
                        results.landmarks[1][2].y - results.landmarks[1][3].y,
                        (results.landmarks[1][2].z || 0) - (results.landmarks[1][3].z || 0)
                    );
                    return (wristToThumb + wristToPinky + thumbMCPToDIP) / 3;
                })();

                const avgHandSize = (handSize1 + handSize2) / 2;
                const dist = Math.hypot(index1.x - index2.x, index1.y - index2.y, (index1.z || 0) - (index2.z || 0));
                const normalizedIndexDistance = avgHandSize > 0 ? dist / avgHandSize : dist;

                this.liveState.global.indexTouchDistance = normalizedIndexDistance;
                this.liveState.global.bothIndexesTouching = normalizedIndexDistance < this.config.touchThreshold;
            } else {
                this.liveState.global.bothIndexesTouching = false;
                this.liveState.global.indexTouchDistance = 1.0;
            }
        } else {
            this.liveState.global.bothIndexesTouching = false;
            this.liveState.global.indexTouchDistance = 1.0;
        }

        // Update gesture detector after state is built (also clears when hands disappear)
        if (this.gestureDetector) {
            this.gestureDetector.updateDetectionForState(this.liveState);
        }

        if (this.debugPanelEnabled) this._updateDebugUI();

        if (this.onUpdateCallback) {
            this.onUpdateCallback(this.liveState);
        }

        // Dispatch pinch events if enabled
        if (this.pinchEventsEnabled) {
            this._dispatchPinchEvents();
        }
    }

    /**
     * Dispatch custom pinch events based on hand state changes
     * @private
     */
    _dispatchPinchEvents() {
        this.liveState.hands.forEach((hand, index) => {
            const isCurrentlyPinching = hand.isPinching;
            const wasPinching = this.previousPinchState[index];

            if (hand.exists) {
                // Pinch start event
                if (isCurrentlyPinching && !wasPinching) {
                    const event = new CustomEvent('pinchstart', {
                        detail: {
                            x: hand.position.x,
                            y: hand.position.y,
                            z: hand.position.z,
                            handIndex: index,
                            handedness: hand.handedness,
                            pinchDistance: hand.pinchDistance,
                            timestamp: Date.now()
                        },
                        bubbles: true,
                        cancelable: true
                    });

                    // Dispatch to the specific element under the pinch position
                    const targetElement = document.elementFromPoint(hand.position.x, hand.position.y);
                    if (targetElement) {
                        targetElement.dispatchEvent(event);
                    }

                    // Also dispatch globally for general listening
                    document.dispatchEvent(event);
                }

                // Pinch move event
                if (isCurrentlyPinching && wasPinching) {
                    const event = new CustomEvent('pinchmove', {
                        detail: {
                            x: hand.position.x,
                            y: hand.position.y,
                            z: hand.position.z,
                            handIndex: index,
                            handedness: hand.handedness,
                            pinchDistance: hand.pinchDistance,
                            timestamp: Date.now()
                        },
                        bubbles: true,
                        cancelable: true
                    });

                    const targetElement = document.elementFromPoint(hand.position.x, hand.position.y);
                    if (targetElement) {
                        targetElement.dispatchEvent(event);
                    }

                    document.dispatchEvent(event);
                }

                // Pinch end event
                if (!isCurrentlyPinching && wasPinching) {
                    const event = new CustomEvent('pinchend', {
                        detail: {
                            x: hand.position.x,
                            y: hand.position.y,
                            z: hand.position.z,
                            handIndex: index,
                            handedness: hand.handedness,
                            pinchDistance: hand.pinchDistance,
                            timestamp: Date.now()
                        },
                        bubbles: true,
                        cancelable: true
                    });

                    const targetElement = document.elementFromPoint(hand.position.x, hand.position.y);
                    if (targetElement) {
                        targetElement.dispatchEvent(event);
                    }

                    document.dispatchEvent(event);
                }
            }

            // Update previous state
            this.previousPinchState[index] = isCurrentlyPinching;
        });
    }

    /**
     * Enable or disable pinch event dispatching
     * @param {boolean} enabled - Whether to dispatch pinch events
     */
    setPinchEvents(enabled = true) {
        this.pinchEventsEnabled = !!enabled;
    }

    /**
     * Check if pinch events are enabled
     * @returns {boolean} True if pinch events are enabled
     */
    arePinchEventsEnabled() {
        return this.pinchEventsEnabled;
    }

    /**
     * Set overlay configuration
     * @param {boolean} enabled - Enable/disable overlay
     * @param {string} color - Overlay color (CSS color value)
     * @param {number} opacity - Overlay opacity (0-1)
     */
    setOverlay(enabled = null, color = null, opacity = null) {
        if (enabled !== null) this.overlayEnabled = enabled;
        if (color !== null) this.overlayColor = color;
        if (opacity !== null) this.overlayOpacity = Math.max(0, Math.min(1, opacity));
        this._updateOverlay();
    }

    /**
     * Get current overlay configuration
     * @returns {Object} Current overlay settings
     */
    getOverlay() {
        return {
            enabled: this.overlayEnabled,
            color: this.overlayColor,
            opacity: this.overlayOpacity
        };
    }

    /**
     * Enable/disable overlay
     * @param {boolean} enabled - Enable overlay
     */
    setOverlayEnabled(enabled) {
        this.overlayEnabled = enabled;
        this._updateOverlay();
    }

    /**
     * Set overlay color
     * @param {string} color - CSS color value
     */
    setOverlayColor(color) {
        this.overlayColor = color;
        this._updateOverlay();
    }

    /**
     * Set overlay opacity
     * @param {number} opacity - Opacity value (0-1)
     */
    setOverlayOpacity(opacity) {
        this.overlayOpacity = Math.max(0, Math.min(1, opacity));
        this._updateOverlay();
    }

    _updateOverlay() {
        // Overlay is now drawn directly on canvas in _renderOverlay method
        // This method kept for API compatibility but no longer needed for DOM manipulation
    }

    /**
     * Set which corner the small preview video is pinned to. Only affects the auto-created
     * preview element (has no effect if you passed your own `videoElement` to init()).
     * @param {'top-left'|'top-right'|'bottom-left'|'bottom-right'} position
     */
    setPreviewPosition(position) {
        this.previewPosition = position;
        this._applyPreviewPosition();
    }

    /**
     * @returns {'top-left'|'top-right'|'bottom-left'|'bottom-right'} Current preview corner
     */
    getPreviewPosition() {
        return this.previewPosition;
    }

    /**
     * Applies `this.previewPosition` to the small preview video's fixed-position offsets.
     * @private
     */
    _applyPreviewPosition() {
        if (!this.videoElement) return;
        const offset = '5px';
        this.videoElement.style.top = '';
        this.videoElement.style.bottom = '';
        this.videoElement.style.left = '';
        this.videoElement.style.right = '';

        switch (this.previewPosition) {
            case 'top-left':
                this.videoElement.style.top = offset;
                this.videoElement.style.left = offset;
                break;
            case 'top-right':
                this.videoElement.style.top = offset;
                this.videoElement.style.right = offset;
                break;
            case 'bottom-left':
                this.videoElement.style.bottom = offset;
                this.videoElement.style.left = offset;
                break;
            case 'bottom-right':
            default:
                this.videoElement.style.bottom = offset;
                this.videoElement.style.right = offset;
                break;
        }
    }

    _renderOverlay(results) {
        if (!this.canvasCtx || !this.canvasElement || !this.video) return;
        const ctx = this.canvasCtx;
        if (!this.debugLinesEnabled && !this.enableVideoPreview) return;

        // Match canvas dimensions to screen size for zoom-to-fill behavior
        this.canvasElement.width = window.innerWidth;
        this.canvasElement.height = window.innerHeight;

        const w = this.canvasElement.width;
        const h = this.canvasElement.height;

        ctx.save();
        ctx.clearRect(0, 0, w, h);

        // Calculate zoom-to-fill dimensions and positioning
        const videoAspect = this.video.videoWidth / this.video.videoHeight;
        const screenAspect = w / h;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoAspect > screenAspect) {
            // Video is wider than screen - fit to height, crop width
            drawHeight = h;
            drawWidth = h * videoAspect;
            offsetX = (w - drawWidth) / 2;
            offsetY = 0;
        } else {
            // Video is taller than screen - fit to width, crop height
            drawWidth = w;
            drawHeight = w / videoAspect;
            offsetX = 0;
            offsetY = (h - drawHeight) / 2;
        }

        // Store video transform for coordinate calculations
        this._videoTransform = {
            offsetX, offsetY, drawWidth, drawHeight,
            videoWidth: this.video.videoWidth,
            videoHeight: this.video.videoHeight
        };

        // Draw Video Frame with zoom-to-fill
        ctx.drawImage(this.video, offsetX, offsetY, drawWidth, drawHeight);

        // Apply configurable overlay
        if (this.overlayEnabled) {
            ctx.fillStyle = this.overlayColor;
            ctx.globalAlpha = this.overlayOpacity;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1.0;
        }

        // Helper function to convert landmark coordinates to zoomed video space
        const landmarkToCanvas = (landmark) => {
            if (!this._videoTransform) return { x: (1 - landmark.x) * w, y: landmark.y * h };

            const { offsetX, offsetY, drawWidth, drawHeight } = this._videoTransform;
            return {
                x: offsetX + (1 - landmark.x) * drawWidth,
                y: offsetY + landmark.y * drawHeight
            };
        };

        // Draw hand landmarks from liveState (which has processed/mirrored landmarks)
        if (this.debugLinesEnabled && this.liveState && this.liveState.hands) {
            this.liveState.hands.forEach((hand, index) => {
                if (!hand.exists || !hand.landmarks || hand.landmarks.length === 0) return;

                const color = hand.handedness === 'Left' ? this.debugColors.cyan : this.debugColors.orange;
                const landmarks = hand.landmarks;

                // Reset graphics state
                ctx.globalAlpha = 1.0;
                ctx.setLineDash([]);

                // Draw connections between landmarks
                if (window.HAND_CONNECTIONS) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = this.debugLineThickness || 2;
                    ctx.shadowBlur = this.debugLineBlur || 0;
                    ctx.shadowColor = color;

                    try {
                        // HAND_CONNECTIONS might be an array or iterable
                        const connections = Array.from(window.HAND_CONNECTIONS);
                        for (let i = 0; i < connections.length; i++) {
                            const connection = connections[i];
                            const start = connection[0];
                            const end = connection[1];

                            if (landmarks[start] && landmarks[end]) {
                                const startPt = landmarkToCanvas(landmarks[start]);
                                const endPt = landmarkToCanvas(landmarks[end]);

                                ctx.beginPath();
                                ctx.moveTo(startPt.x, startPt.y);
                                ctx.lineTo(endPt.x, endPt.y);
                                ctx.stroke();
                            }
                        }
                    } catch (e) {
                        // Silently skip if HAND_CONNECTIONS format is unexpected
                    }
                }

                // Draw wrist base as a square
                if (landmarks[0]) {
                    const wristPt = landmarkToCanvas(landmarks[0]);
                    const squareSize = 20;

                    ctx.strokeStyle = color;
                    ctx.lineWidth = this.debugLineThickness || 2;
                    ctx.shadowBlur = this.debugLineBlur || 0;
                    ctx.shadowColor = color;
                    ctx.strokeRect(wristPt.x - squareSize / 2, wristPt.y - squareSize / 2, squareSize, squareSize);
                }

                // Draw finger lines: 3 connections per finger (between all knuckles)
                // Fingers: Thumb (1-4), Index (5-8), Middle (9-12), Ring (13-16), Pinky (17-20)
                const fingerBases = [1, 5, 9, 13, 17];
                ctx.strokeStyle = color;
                ctx.lineWidth = this.debugLineThickness || 2;
                ctx.shadowBlur = this.debugLineBlur || 0;
                ctx.shadowColor = color;

                for (let i = 0; i < fingerBases.length; i++) {
                    const base = fingerBases[i];

                    // Draw 3 connections: base->joint1, joint1->joint2, joint2->tip
                    for (let j = 0; j < 3; j++) {
                        const start = base + j;
                        const end = base + j + 1;

                        if (landmarks[start] && landmarks[end]) {
                            const startPt = landmarkToCanvas(landmarks[start]);
                            const endPt = landmarkToCanvas(landmarks[end]);

                            ctx.beginPath();
                            ctx.moveTo(startPt.x, startPt.y);
                            ctx.lineTo(endPt.x, endPt.y);
                            ctx.stroke();
                        }
                    }
                }

                // Draw rotation vectors
                const toCanvas = (i) => {
                    const lm = landmarks[i];
                    if (!lm) return null;
                    return landmarkToCanvas(lm);
                };

                const wristPt = toCanvas(0);
                const middleMCPPt = toCanvas(9);
                const ringMCPPt = toCanvas(13);

                if (wristPt && middleMCPPt && ringMCPPt) {
                    // Calculate midpoint between middle and ring finger bases
                    const midPt = {
                        x: (middleMCPPt.x + ringMCPPt.x) / 2,
                        y: (middleMCPPt.y + ringMCPPt.y) / 2
                    };

                    // Draw line from wrist to midpoint (replaces old pink line)
                    ctx.strokeStyle = this.debugColors.magenta;
                    ctx.lineWidth = this.debugLineThickness || 2;
                    ctx.shadowBlur = this.debugLineBlur || 0;
                    ctx.shadowColor = this.debugColors.magenta;
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath();
                    ctx.moveTo(wristPt.x, wristPt.y);
                    ctx.lineTo(midPt.x, midPt.y);
                    ctx.stroke();

                    const midX = (wristPt.x + midPt.x) / 2;
                    const midY = (wristPt.y + midPt.y) / 2;
                    ctx.fillStyle = this.debugColors.magenta;
                    ctx.globalAlpha = 0.95;
                    ctx.beginPath();
                    ctx.arc(midPt.x, midPt.y, 3, 0, 2 * Math.PI);
                    ctx.fill();

                    // Add angle visualization like hand_visualizer
                    // Calculate angle between downward vertical and wrist-to-ring finger line
                    const ringFingerX = ringMCPPt.x;
                    const ringFingerY = ringMCPPt.y;
                    const ringVerticalAngle = -Math.PI / 2; // -90 degrees (Straight Up)
                    let ringToWristAngle = Math.atan2(wristPt.y - ringFingerY, wristPt.x - ringFingerX);
                    let ringAngleDiff = Math.abs((ringToWristAngle - ringVerticalAngle) * 180 / Math.PI);

                    // Normalize the display angle to be the "short" way (0-180)
                    let ringDisplayAngle = ringAngleDiff;
                    if (ringAngleDiff > 180) {
                        ringDisplayAngle = 360 - ringAngleDiff;
                    }

                    // Determine if ring finger is to the left of wrist
                    let ringIsLeft = wristPt.x < ringFingerX;

                    // Draw angle arcs between ring and middle knuckles with dot at midpoint
                    ctx.strokeStyle = this.debugColors.magenta;
                    ctx.lineWidth = this.debugLineThickness || 2;
                    ctx.shadowBlur = this.debugLineBlur || 0;
                    ctx.shadowColor = this.debugColors.magenta;
                    ctx.globalAlpha = 0.9;

                    // Draw vertical line down from ring finger
                    ctx.beginPath();
                    ctx.moveTo(wristPt.x, wristPt.y);
                    ctx.lineTo(wristPt.x, wristPt.y - 100);
                    ctx.stroke();

                    // Calculate angle between upward vertical and wrist-to-ring finger line
                    ringToWristAngle = Math.atan2(wristPt.y - ringFingerY, wristPt.x - ringFingerX);
                    ringAngleDiff = Math.abs((ringToWristAngle - ringVerticalAngle) * 180 / Math.PI);

                    // Normalize to display angle to be the "short" way (0-180)
                    ringDisplayAngle = ringAngleDiff;
                    if (ringAngleDiff > 180) {
                        ringDisplayAngle = 360 - ringAngleDiff;
                    }

                    // Determine if ring finger is to left of wrist
                    ringIsLeft = wristPt.x < ringFingerX;

                    // Calculate angles using hand_visualizer exact logic
                    const verticalAngle = -Math.PI / 2; // Straight up
                    const toMidAngle = Math.atan2(midPt.y - wristPt.y, midPt.x - wristPt.x);
                    let angleDiff = Math.abs((toMidAngle - verticalAngle) * 180 / Math.PI);

                    // Handle angles > 180 degrees
                    let displayAngle = angleDiff;
                    let displaySide = 1; // Default right side
                    if (angleDiff > 180) {
                        displayAngle = 360 - angleDiff;
                        displaySide = -1; // Left side
                    }

                    // Calculate the actual angle for drawing (use smaller angle)
                    let drawAngle = toMidAngle;
                    if (angleDiff > 180) {
                        drawAngle = verticalAngle - (displayAngle * Math.PI / 180);
                    }

                    // Draw wrist circle
                    ctx.strokeStyle = this.debugColors.magenta;
                    ctx.lineWidth = this.debugLineThickness || 2;
                    ctx.shadowBlur = this.debugLineBlur || 0;
                    ctx.shadowColor = this.debugColors.magenta;
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath();
                    ctx.arc(wristPt.x, wristPt.y, 20, 0, Math.PI * 2);
                    ctx.stroke();

                    // Draw extended vertical line
                    const extendedLineLength = 100;
                    ctx.beginPath();
                    ctx.moveTo(wristPt.x, wristPt.y);
                    ctx.lineTo(wristPt.x, wristPt.y - extendedLineLength);
                    ctx.stroke();

                    // Draw line to midpoint
                    ctx.beginPath();
                    ctx.moveTo(wristPt.x, wristPt.y);
                    ctx.lineTo(midPt.x, midPt.y);
                    ctx.stroke();

                    // Draw angle arc at wrist center using hand_visualizer logic
                    const isLeft = midPt.x < wristPt.x;
                    ctx.beginPath();
                    ctx.arc(wristPt.x, wristPt.y, 100 / 2, verticalAngle, drawAngle, isLeft);
                    ctx.stroke();
                }

                const thumbTipPt = toCanvas(4);
                const indexTipPt = toCanvas(8);
                if (thumbTipPt && indexTipPt) {
                    ctx.strokeStyle = this.debugColors.cyan;
                    ctx.lineWidth = this.debugLineThickness || 2;
                    ctx.shadowBlur = this.debugLineBlur || 0;
                    ctx.shadowColor = this.debugColors.cyan;
                    ctx.globalAlpha = 0.9;
                    ctx.beginPath();
                    ctx.moveTo(thumbTipPt.x, thumbTipPt.y);
                    ctx.lineTo(indexTipPt.x, indexTipPt.y);
                    ctx.stroke();

                    const midX = (thumbTipPt.x + indexTipPt.x) / 2;
                    const midY = (thumbTipPt.y + indexTipPt.y) / 2;
                    ctx.fillStyle = this.debugColors.cyan;
                    ctx.globalAlpha = 0.95;
                    ctx.beginPath();
                    ctx.arc(midX, midY, 5, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Draw landmark dots
                for (let i = 0; i < landmarks.length; i++) {
                    const landmark = landmarks[i];
                    if (landmark) {
                        const pt = landmarkToCanvas(landmark);

                        // Draw filled circle (no stroke)
                        ctx.fillStyle = color;
                        ctx.globalAlpha = 1.0;
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, this.debugDotSize || 3, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            });
        }

        ctx.restore();
    }

    /**
     * Checks if a specific hand's center is within a defined 3D volume.
     * @param {number} handIndex - Index of the hand (0 or 1).
     * @param {Object} volume - { minX, maxX, minY, maxY, minZ, maxZ } in pixels/normalized for Z.
     * @returns {boolean}
     */
    isHandInVolume(handIndex, volume) {
        const hand = this.liveState.hands[handIndex];
        if (!hand || !hand.exists) return false;

        const { x, y, z } = hand.position;
        // Z is normalized from MediaPipe (-1 to 1 usually, around 0 is focal plane)
        return (
            x >= volume.minX && x <= volume.maxX &&
            y >= volume.minY && y <= volume.maxY &&
            z >= volume.minZ && z <= volume.maxZ
        );
    }

    /**
     * Registers a callback for real-time state updates.
     * @param {Function} callback 
     */
    onUpdate(callback) {
        this.onUpdateCallback = callback;
    }

    /**
     * Returns the current live state.
     * @returns {Object}
     */
    getState() {
        return this.liveState;
    }

    /**
     * Returns the raw video element used by the engine.
     * Helpful for drawing debug overlays if needed.
     */
    getVideo() {
        return this.video;
    }

    // --- Reusable Gesture Utilities ---

    /**
     * Helper to get the 2D screen distance between the two hands based on their positions.
     * @returns {number|null} Distance in pixels, or null if both hands aren't detected.
     */
    getDistanceBetweenHands() {
        const h1 = this.liveState.hands[0];
        const h2 = this.liveState.hands[1];
        if (h1.exists && h2.exists) {
            return Math.hypot(h1.position.x - h2.position.x, h1.position.y - h2.position.y);
        }
        return null;
    }

    /**
     * Helper to get DOM elements currently at a specific hand's position.
     * @param {number} handIndex - Index of the hand (0 or 1).
     * @returns {Element[]} Array of DOM elements at that position.
     */
    getElementsAtHand(handIndex) {
        const hand = this.liveState.hands[handIndex];
        if (!hand || !hand.exists) return [];
        return document.elementsFromPoint(hand.position.x, hand.position.y);
    }

    /**
     * Helper to calculate the 2D angle between two points in degrees.
     * @param {Object} p1 - {x, y}
     * @param {Object} p2 - {x, y}
     * @returns {number} Angle in degrees.
     */
    getAngleBetweenPoints(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }
}

/**
 * Static utility namespace, usable without an engine instance.
 * distanceBetween/angleBetween/collides accept any point-like object that has
 * either pixel coords {x, y} (e.g. hand.INDEX_TIP, hand.position) or
 * normalized coords {nx, ny} (e.g. entries from hand.landmarks) - pixel wins if both present.
 */
GestureEngine.utils = {
    /**
     * @param {{x?:number,y?:number,nx?:number,ny?:number}} pt1
     * @param {{x?:number,y?:number,nx?:number,ny?:number}} pt2
     * @returns {number} Euclidean distance in whichever space the points are given.
     */
    distanceBetween(pt1, pt2) {
        const x1 = pt1.x ?? pt1.nx, y1 = pt1.y ?? pt1.ny;
        const x2 = pt2.x ?? pt2.nx, y2 = pt2.y ?? pt2.ny;
        return Math.hypot(x2 - x1, y2 - y1);
    },

    /**
     * @param {{x?:number,y?:number,nx?:number,ny?:number}} pt1
     * @param {{x?:number,y?:number,nx?:number,ny?:number}} pt2
     * @returns {number} Angle in radians between pt1 -> pt2.
     */
    angleBetween(pt1, pt2) {
        const x1 = pt1.x ?? pt1.nx, y1 = pt1.y ?? pt1.ny;
        const x2 = pt2.x ?? pt2.nx, y2 = pt2.y ?? pt2.ny;
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * Re-maps a value from one range to another.
     */
    map(value, start1, stop1, start2, stop2) {
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    },

    /**
     * Linear interpolation between start and end by amt (0-1).
     */
    lerp(start, end, amt) {
        return start + (end - start) * amt;
    },

    /**
     * Inverse of lerp: given a value within [start, end], returns its 0-1 position.
     */
    inverseLerp(start, end, value) {
        return (value - start) / (end - start);
    },

    /**
     * Smooths val towards target. Pass `dt` (delta time, e.g. seconds since last frame)
     * for frame-rate-independent smoothing; omit it (defaults to 1) to match the
     * original simple 3-arg behavior.
     * @param {number} val - Current smoothed value.
     * @param {number} target - Target value to move towards.
     * @param {number} [smoothing=0.1] - 0-1, higher = snappier.
     * @param {number} [dt=1] - Delta time since last call. Optional.
     * @returns {number} New smoothed value.
     */
    damp(val, target, smoothing = 0.1, dt = 1) {
        const t = 1 - Math.pow(1 - smoothing, dt);
        return val + (target - val) * t;
    },

    /**
     * Hit-tests a landmark point (pixel or normalized, see distanceBetween) against
     * a DOM element's bounding box. Normalized points are compared as-is against
     * getBoundingClientRect(), so pass pixel-space points ({x,y}) for accurate results.
     * @param {{x?:number,y?:number,nx?:number,ny?:number}} point
     * @param {Element} element
     * @returns {boolean}
     */
    collides(point, element) {
        if (!element || typeof element.getBoundingClientRect !== 'function') return false;
        const rect = element.getBoundingClientRect();
        const x = point.x ?? point.nx;
        const y = point.y ?? point.ny;
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }
};

window.GestureEngine = GestureEngine;