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

// Add support for .glb and .gltf files in the Media Library
function allow_3d_file_uploads($mime_types) {
    $mime_types['glb'] = 'model/gltf-binary'; // Add .glb file type
    $mime_types['gltf'] = 'model/gltf+json';  // Add .gltf file type
    return $mime_types;
}
add_filter('upload_mimes', 'allow_3d_file_uploads');


add_filter('wp_check_filetype_and_ext', function($data, $file, $filename, $mime_types, $real_mime_type) {
    if (empty($data['ext'])
        || empty($data['type'])
    ) {
        $file_type = wp_check_filetype($filename, $mime_types);

        if ('gltf' === $file_type['ext']) {
            $data['ext']  = 'gltf';
            $data['type'] = 'model/gltf+json';
        }

        if ('glb' === $file_type['ext']) {
            $data['ext']  = 'glb';
            $data['type'] = 'model/glb-binary';
        }
    }

    return $data;
}, 10, 5);

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



// // Add meta boxes for Scene settings
// function threejs_add_scene_meta_boxes() {
//     add_meta_box(
//         'threejs_scene_settings',       // Meta box ID
//         '3D Scene Settings',            // Meta box title
//         'threejs_scene_meta_box_html',  // Callback to display fields
//         'scene',                        // Post type
//         'normal',                       // Context (normal, side, advanced)
//         'high'                          // Priority
//     );
// }
// add_action('add_meta_boxes', 'threejs_add_scene_meta_boxes');





// Add meta box for 3D Element Editor in Scene post type
function threejs_add_editor_meta_box() {
    add_meta_box(
        'threejs_model_editor', // Meta box ID
        'Codes 3D Scene Editor',    // Meta box title
        'threejs_editor_page', // Callback function to render the content
        'scene',                // Post type where the meta box will appear
        'normal',               // Context (normal, side, or advanced)
        'default'               // Priority
    );
}
add_action('add_meta_boxes', 'threejs_add_editor_meta_box');


// Admin page content
function threejs_editor_page($post) {


  // Retrieve existing values
  $model_url = get_post_meta($post->ID, 'threejs_model_url', true);
  $position = get_post_meta($post->ID, 'threejs_position', true);
  $rotation = get_post_meta($post->ID, 'threejs_rotation', true);
  $light_intensity = get_post_meta($post->ID, 'threejs_light_intensity', true);

  // Default values if empty
  $position = $position ? json_decode($position, true) : ['x' => 0, 'y' => 0, 'z' => 0];
  $rotation = $rotation ? json_decode($rotation, true) : ['x' => 0, 'y' => 0, 'z' => 0];
  $light_intensity = $light_intensity ?: 1;

  // Output the form
    ?>
    <!-- start HTML -->
    <div id="threejs-editor-container">
        <script type="importmap">
          {
            "imports": {
              "three": "https://unpkg.com/three@0.150.1/build/three.module.js",
              "three/addons/": "https://unpkg.com/three@0.150.1/examples/jsm/"
            }
          }
        </script>
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
          <input type="range" id="ambient-light-slider" min="0" max="2" step="0.01" value="<?php echo esc_attr($light_intensity); ?>" style="width: 100%;">

          <label for="directional-light-slider" style="margin-top: 10px;">Directional Light Intensity:</label>
          <input type="range" id="directional-light-slider" min="0" max="2" step="0.1" value="1" style="width: 100%;">
      </div>

      <h1>NEW</h1>

      <p>
          <label for="threejs_model_url">Model File:</label><br>
          <input type="hidden" id="threejs_model_url" name="threejs_model_url" value="<?php echo esc_url($model_url); ?>" />
          <button type="button" class="button" id="threejs_model_url_button">Select Model</button>
          <p id="threejs_model_url_preview">
              <?php if ($model_url): ?>
                  Current Model: <a href="<?php echo esc_url($model_url); ?>" target="_blank"><?php echo esc_url($model_url); ?></a>
              <?php endif; ?>
          </p>
      </p>

      <p>
          <strong>Position (Transforms):</strong><br>
          X: <input type="number" name="threejs_position_x" id="threejs_position_x" value="<?php echo esc_attr($position['x']); ?>" step="0.1" />
          Y: <input type="number" name="threejs_position_y" id="threejs_position_y" value="<?php echo esc_attr($position['y']); ?>" step="0.1" />
          Z: <input type="number" name="threejs_position_z" id="threejs_position_z" value="<?php echo esc_attr($position['z']); ?>" step="0.1" />
      </p>

      <p>
          <strong>Rotation (Transforms):</strong><br>
          X: <input type="number" name="threejs_rotation_x" id="threejs_rotation_x" value="<?php echo esc_attr($rotation['x']); ?>" step="0.1" />
          Y: <input type="number" name="threejs_rotation_y" id="threejs_rotation_y" value="<?php echo esc_attr($rotation['y']); ?>" step="0.1" />
          Z: <input type="number" name="threejs_rotation_z" id="threejs_rotation_z" value="<?php echo esc_attr($rotation['z']); ?>" step="0.1" />
      </p>

      <p>
          <label for="threejs_light_intensity">Light Intensity:</label><br>
          <input type="range" name="threejs_light_intensity" id="threejs_light_intensity" min="0" max="10" step="0.1" value="<?php echo esc_attr($light_intensity); ?>" />
          <span id="light_intensity_value"><?php echo esc_attr($light_intensity); ?></span>
      </p>


      <script type="module" src="<?php echo plugins_url('admin.js', __FILE__); ?>"></script>

    </div>
    <?php
}
