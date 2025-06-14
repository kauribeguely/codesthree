=== Code Three 3D Interactive ===
Contributors: kauribeguely
Tags: 3d, three.js, animation, interactive, webgl
Requires at least: 5.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Easily build animated/interactive 3D scenes and embed using a shortcode. Take your site to the next dimension. Powered by Three.js

== Description ==

**Code 3** lets you embed multi-object, interactive 3D scenes into your WordPress site using a simple shortcode.

Ideal for developers, designers, and digital creatives who want to create engaging 3D web experiences — without hardcoding them into templates.

= Features =
- Upload multiple GLB models to a scene and change their transforms (position, rotation, scale)
- Embed Three.js 3D scenes via shortcode
- Mousemove and scroll interaction

= How It Works =
1. After clicking Add New Scene, you can add models by uploading GLB to the media library
2. You can change all objects position/rotation/scale in the scene editor
3. You change global settings like light intensity and scroll/mouse interaction
4. Place the shortcode anywhere you want it to display

= Shortcode Examples =

`[codes_scene id="39"]`

By default the width will be 100% of the container the shortcode is placed and the height will be 500px

`[codes_scene id="39" width="500px" height="30vh"]`

Set custom height and width of the shortcode, accepts all CSS measurements.

== Installation ==

Installing and activating via the plugin repository is all that's needed. 

For a guide on how to build a basic scene visit URL HERE

== Frequently Asked Questions ==

=I added a model, why can't I see it?=
The most likely is the model size is huge/tiny. Try scaling it up or down. 

=Why is my model is completely black?=
Either lighting or materials are not setup correctly. Try change the light intensity or toggle environment light. If it's a material issue you need to fix the model in a 3D software e.g. blender or find a new one.

=My scene looks smaller that I made it=
The scene size is based on the height/width of the canvas. The editor canvas is large, almost the whole screen. You can either make the container that holds the shortcode bigger, change the width/height values in the shortcode itself or adjust scales of objects in the editor.

== Screenshots ==

1. A rotating 3D cube embedded via shortcode
2. Scroll-triggered 3D animation example

== Changelog ==

= 1.0 =
* Initial release
* Upload/Add GLB
* Clone/Delete scene objects
* Change all transforms of models (gizmo/hotkeys)
* Default lights, adjustable intensity, directional light can be positioned
* Environment light with one static texture
* Insert scenes via shortcodes (can set width and height within these)
* Allows multiple shortcode instances on the same page
* Scroll link to camera position animation
* Mouse move to scene rotation animation

== Upgrade Notice ==

= 1.0 =
Initial Release