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

// Enqueue scripts only on Scene pages
function threejs_enqueue_scene_scripts() {
    if (is_singular('scene')) { // Check if the current post type is 'scene'
        // Enqueue es-module-shims
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
            plugins_url('admin.js', __FILE__),
            array(),
            null,
            true // Load in the footer
        );

        // Add type="module" attribute to the script
        add_filter('script_loader_tag', function ($tag, $handle) {
            if ('threejs-editor' === $handle) {
                return str_replace('<script ', '<script type="module" ', $tag);
            }
            return $tag;
        }, 10, 2);

        // Enqueue styles (if needed)
        wp_enqueue_style(
            'threejs-styles',
            plugin_dir_url(__FILE__) . 'styles.css',
            array(),
            '1.0.0'
        );
    }
}
add_action('wp_enqueue_scripts', 'threejs_enqueue_scene_scripts');

add_action('init', 'threejs_enqueue_scene_scripts');


// Add meta box for 3D Element Editor in Scene post type
function threejs_add_editor_meta_box() {
    add_meta_box(
        'threejs_model_editor', // Meta box ID
        '3D Element Editor',    // Meta box title
        'threejs_editor_page', // Callback function to render the content
        'scene',                // Post type where the meta box will appear
        'normal',               // Context (normal, side, or advanced)
        'default'               // Priority
    );
}
add_action('add_meta_boxes', 'threejs_add_editor_meta_box');
// add_action('add_meta_boxes', 'threejs_editor_page');


// // Add menu item
// function threejs_editor_menu() {
//     add_menu_page(
//         '3D Element Editor',
//         'Codes 3D',
//         'manage_options',
//         'threejs-model-editor',
//         'threejs_editor_page',
//         'dashicons-visibility',
//         100
//     );
// }
// add_action( 'admin_menu', 'threejs_editor_menu' );

// Hook to initialize the custom post type
add_action('init', 'codesthree_register_scenes_post_type');

function codesthree_register_scenes_post_type() {
    // Labels for the post type
    $labels = array(
        'name'               => __('Scenes', 'codesthree'),
        'singular_name'      => __('Scene', 'codesthree'),
        'menu_name'          => __('Scenes', 'codesthree'),
        'name_admin_bar'     => __('Scene', 'codesthree'),
        'add_new'            => __('Add New Scene', 'codesthree'),
        'add_new_item'       => __('Add New Scene', 'codesthree'),
        'edit_item'          => __('Edit Scene', 'codesthree'),
        'new_item'           => __('New Scene', 'codesthree'),
        'view_item'          => __('View Scene', 'codesthree'),
        'search_items'       => __('Search Scenes', 'codesthree'),
        'not_found'          => __('No scenes found', 'codesthree'),
        'not_found_in_trash' => __('No scenes found in Trash', 'codesthree'),
    );

    // Arguments for the post type
    $args = array(
        'labels'             => $labels,
        'public'             => true,
        'show_in_menu'       => true,
        'menu_icon'          => 'dashicons-cube', // Cube icon for 3D
        'supports'           => array('title', 'editor', 'thumbnail'),
        'has_archive'        => true,
        'show_in_rest'       => true, // Enable Gutenberg editor
    );

    // Register the post type
    register_post_type('scene', $args);
}



// Admin page content
function threejs_editor_page($post) {
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
        <script type="module" src="<?php echo plugins_url('admin.js', __FILE__); ?>"></script>
        <script src="https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js"></script>
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
