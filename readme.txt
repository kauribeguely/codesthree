=== Code Three 3D Interactive ===
Contributors: kauribeguely
Tags: 3d, three.js, animation, interactive, dimension
Requires at least: 5.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Easily build animated/interactive 3D scenes and embed using a shortcode. Take your site to the next dimension. Powered by Three.js

== Description ==

**Code 3** lets you embed animated, interactive 3D scenes into your WordPress site using a simple shortcode.

Ideal for developers, designers, and digital creatives who want to create engaging 3D web experiences — without hardcoding them into templates.

= Features =
- Embed Three.js 3D scenes via shortcode
- Mouse and scroll interaction support out of the box
- Modular plugin architecture: drop your scene code in a dedicated JS file
- Lightweight, loads only on pages using the shortcode

= How It Works =
1. Create a `.js` file that initializes your Three.js scene (we provide a template).
2. Upload it to the plugin's `/scenes` folder.
3. Use the `[three_scene file="yourfile.js"]` shortcode in any post or page.
4. The plugin injects your script with canvas container and necessary styles.

= Shortcode Examples =

[codes_scene id="1234]

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/3d-scene-shortcode`.
2. Activate the plugin through the 'Plugins' menu.
3. Use the shortcode `[three_scene file="yourfile.js"]` to display a scene.
4. Upload your scene JavaScript file to `/wp-content/plugins/3d-scene-shortcode/scenes/`.

== Frequently Asked Questions ==

= What version of Three.js is included? =
We bundle version `0.150.1` via module imports, but you can customize this by overriding the import map.

= Can I use this with page builders? =
Yes! You can use the shortcode block/widget to embed your 3D scene.

= How do I add scroll or mouse interaction? =
Just use standard Three.js input handling in your scene file. The plugin handles canvas setup and resizing — you focus on the fun stuff.

== Screenshots ==

1. A rotating 3D cube embedded via shortcode
2. Scroll-triggered 3D animation example

== Changelog ==

= 1.0.0 =
* Initial release with shortcode rendering
* Basic canvas and responsive container
* Support for scroll and mouse input via user scene files

