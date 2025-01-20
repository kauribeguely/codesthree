<?php
/*
Plugin Name: Codes Three 3D WordPress
Description: Bring WordPress to the next dimension
Version: 1.0
Author: Kauri Beguely
*/

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function enqueue_threejs_editor_scripts( $hook ) {
    if ( $hook !== 'toplevel_page_threejs-model-editor' ) {
        return;
    }

    // Enqueue es-module-shims script
    wp_enqueue_script(
        'es-module-shims',
        'https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js',
        array(),
        null,
        false // Load in the header
    );

    // Enqueue your admin.js script with type="module"
    wp_enqueue_script(
        'threejs-editor',
        plugins_url( 'admin.js', __FILE__ ),
        array(),
        null,
        true // Load in the footer
    );

    // Add type="module" attribute to the script
    add_filter( 'script_loader_tag', function ( $tag, $handle ) {
        if ( 'threejs-editor' === $handle ) {
            return str_replace( '<script ', '<script type="module" ', $tag );
        }
        return $tag;
    }, 10, 2 );
    wp_enqueue_style( 'threejs-editor-style', plugins_url( 'styles.css', __FILE__ ) );
}
add_action( 'admin_enqueue_scripts', 'enqueue_threejs_editor_scripts' );


// Add menu item
function threejs_editor_menu() {
    add_menu_page(
        '3D Element Editor',
        'Codes 3D',
        'manage_options',
        'threejs-model-editor',
        'threejs_editor_page',
        'dashicons-visibility',
        100
    );
}
add_action( 'admin_menu', 'threejs_editor_menu' );

// Admin page content
function threejs_editor_page() {
    ?>
    <div id="threejs-editor-container">
        <script type="importmap">
          {
            "imports": {
              "three": "https://unpkg.com/three@0.150.1/build/three.module.js",
              "three/addons/": "https://unpkg.com/three@0.150.1/examples/jsm/"
            }
          }
        </script>
        <h1>3D Model Editor</h1>

        <div id="threejs-canvas" style="width: 1000px; height: 500px;"></div>
        <button id="save-model-data">Save Changes</button>

        <div id="label" style="margin-top: 10px; padding: 10px; border: 1px solid #ddd; background: #f9f9f9;">
            <b>Position:</b> x: 0, y: 0, z: 0<br>
            <b>Rotation:</b> x: 0°, y: 0°, z: 0°
        </div>

        <div style="margin-top: 10px;">
          <label for="ambient-light-slider">Ambient Light Intensity:</label>
          <input type="range" id="ambient-light-slider" min="0" max="2" step="0.1" value="1" style="width: 100%;">

          <label for="directional-light-slider" style="margin-top: 10px;">Directional Light Intensity:</label>
          <input type="range" id="directional-light-slider" min="0" max="2" step="0.1" value="1" style="width: 100%;">
      </div>
    </div>
    <?php
}
