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


function save_scene_metadata($post_id) {
    // Verify this is a "scene" post type
    if (get_post_type($post_id) !== 'scene') {
        return;
    }

    // // Verify nonce and user permissions
    // if (
    //     !isset($_POST['scene_meta_nonce']) ||
    //     !wp_verify_nonce($_POST['scene_meta_nonce'], 'save_scene_metadata')
    // ) {
    //     return;
    // }

    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    // Save position and rotation metadata
    $fields = [
        'threejs_pos_x',
        'threejs_pos_y',
        'threejs_pos_z',
        'threejs_rot_x',
        'threejs_rot_y',
        'threejs_rot_z',
        'threejs_model_url',
        'ambient_light_intensity'
    ];

    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            update_post_meta($post_id, $field, sanitize_text_field($_POST[$field]));
        }
    }
}
add_action('save_post', 'save_scene_metadata');
// add_action('save_post', 'save_scene_metadata2');


function save_scene_metadata2($post_id) {
    // Check if it's a valid post save
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return $post_id;
    }

    // Check if it's your custom post type
    if ('scene' !== get_post_type($post_id)) {
        return $post_id;
    }

    // Sanitize the value before saving
    if (isset($_POST['threejs_rot_x'])) {
        $rot_x = sanitize_text_field($_POST['threejs_rot_x']);
        update_post_meta($post_id, 'threejs_rot_x', $rot_x);
    }

    return $post_id;
}
// add_action('save_post', 'save_threejs_meta_data');


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
  // $position = get_post_meta($post->ID, 'threejs_position', true);
  // $rotation = get_post_meta($post->ID, 'threejs_rotation', true);
  // $position = $position ? json_decode($position, true) : ['x' => 0, 'y' => 0, 'z' => 0];
  // $rotation = $rotation ? json_decode($rotation, true) : ['x' => 0, 'y' => 0, 'z' => 0];

  // Load saved metadata
  $pos_x = get_post_meta($post->ID, 'threejs_pos_x', true);
  $pos_y = get_post_meta($post->ID, 'threejs_pos_y', true);
  $pos_z = get_post_meta($post->ID, 'threejs_pos_z', true);

  $rot_x = get_post_meta($post->ID, 'threejs_rot_x', true);
  $rot_y = get_post_meta($post->ID, 'threejs_rot_y', true);
  $rot_z = get_post_meta($post->ID, 'threejs_rot_z', true);

  $light_intensity = get_post_meta($post->ID, 'ambient_light_intensity', true);

  // Default values if empty
  $light_intensity = $light_intensity ?: 0.5;


  $scene_data = array(
      'positionX' => $pos_x ?: 0,
      'positionY' => $pos_y ?: 0,
      'positionZ' => $pos_z ?: 0,
      'rotationX' => $rot_x ?: 0,
      'rotationY' => $rot_y ?: 0,
      'rotationZ' => $rot_z ?: 0,
      'lightIntensity' => $light_intensity ?: 0.5,
  );

  // wp_nonce_field('save_scene_metadata', 'scene_meta_nonce');
  // Output the form
    ?>
    <!-- start HTMLs -->
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


        <!-- <div id="label" style="margin-top: 10px; padding: 10px; border: 1px solid #ddd; background: #f9f9f9;">
            <b>Position:</b> x: 0, y: 0, z: 0<br>
            <b>Rotation:</b> x: 0°, y: 0°, z: 0°
        </div> -->


        <!-- <div style="margin-top: 10px;">
          <label for="ambient-light-slider">Ambient Light Intensity:</label>
          <input type="range" id="ambient-light-slider" min="0" max="2" step="0.01" value="1" style="width: 100%;">

          <label for="directional-light-slider" style="margin-top: 10px;">Directional Light Intensity:</label>
          <input type="range" id="directional-light-slider" min="0" max="2" step="0.1" value="1" style="width: 100%;">
      </div> -->





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
          X: <input type="number" name="threejs_pos_x" id="threejs_position_x" value="<?php echo esc_attr($pos_x); ?>" step="0.01" />
          Y: <input type="number" name="threejs_pos_y" id="threejs_position_y" value="<?php echo esc_attr($pos_y); ?>" step="0.01" />
          Z: <input type="number" name="threejs_pos_z" id="threejs_position_z" value="<?php echo esc_attr($pos_z); ?>" step="0.01" />
          <!-- X: <input type="number" name="threejs_position_x" id="threejs_position_x" value="<?php //echo esc_attr($position['x']); ?>" step="0.1" />
          Y: <input type="number" name="threejs_position_y" id="threejs_position_y" value="<?php //echo esc_attr($position['y']); ?>" step="0.1" />
          Z: <input type="number" name="threejs_position_z" id="threejs_position_z" value="<?php //echo esc_attr($position['z']); ?>" step="0.1" /> -->
      </p>

      <p>
          <strong>Rotation (Transforms):</strong><br>
          X: <input type="number" name="threejs_rot_x" id="threejs_rotation_x" value="<?php echo esc_attr($rot_x); ?>" step="0.01" />
          Y: <input type="number" name="threejs_rot_y" id="threejs_rotation_y" value="<?php echo esc_attr($rot_y); ?>" step="0.01" />
          Z: <input type="number" name="threejs_rot_z" id="threejs_rotation_z" value="<?php echo esc_attr($rot_z); ?>" step="0.01" />
      </p>

      <p>
          <label for="ambient-light-slider">Light Intensity:</label><br>
          <input type="range" name="ambient_light_intensity" id="ambient-light-slider" min="0" max="3" step="0.05" value="<?php echo esc_attr($light_intensity); ?>" />
          <span id="light_intensity_value"><?php echo esc_attr($light_intensity); ?></span>
      </p>

      <script>
        // Pass PHP data to JavaScript
        const sceneData = <?php echo json_encode($scene_data); ?>;
        console.log('Three.js Transform Data:', sceneData);
      </script>
      <script type="module" src="<?php echo plugins_url('admin.js', __FILE__); ?>"></script>


    </div>
    <?php
}
