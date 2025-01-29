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


function get_scene_data($post_id) {
    return array(
        'modelUrl' => get_post_meta($post_id, 'threejs_model_url', true) ?: "",
        'positionX' => get_post_meta($post_id, 'threejs_pos_x', true) ?: 0,
        'positionY' => get_post_meta($post_id, 'threejs_pos_y', true) ?: 0,
        'positionZ' => get_post_meta($post_id, 'threejs_pos_z', true) ?: 0,
        'rotationX' => get_post_meta($post_id, 'threejs_rot_x', true) ?: 0,
        'rotationY' => get_post_meta($post_id, 'threejs_rot_y', true) ?: 0,
        'rotationZ' => get_post_meta($post_id, 'threejs_rot_z', true) ?: 0,
        'scale' => get_post_meta($post_id, 'scale', true) ?: 1,
        'lightIntensity' => get_post_meta($post_id, 'ambient_light_intensity', true) ?: 0.5,
        'mouseRotationX' => get_post_meta($post_id, 'mouseRotationX', true) ?: 0,
        'mouseRotationY' => get_post_meta($post_id, 'mouseRotationY', true) ?: 0,
        'mouseRotationZ' => get_post_meta($post_id, 'mouseRotationZ', true) ?: 0,
        'scrollMoveX' => get_post_meta($post_id, 'scrollMoveX', true) ?: 0,
        'scrollMoveY' => get_post_meta($post_id, 'scrollMoveY', true) ?: 0,
        'scrollMoveZ' => get_post_meta($post_id, 'scrollMoveZ', true) ?: 0,
        'mouseAnimationLink' => get_post_meta($post_id, 'mouseAnimationLink', true) ?: '',
        'scrollAnimationLink' => get_post_meta($post_id, 'scrollAnimationLink', true) ?: ''
    );
}



function inject_threejs_assets() {
        ?>

        <script type="importmap">
            {
                "imports": {
                    "three": "https://unpkg.com/three@0.150.1/build/three.module.js",
                    "three/addons/": "https://unpkg.com/three@0.150.1/examples/jsm/"
                }
            }
        </script>
        <script src="https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js"></script>
        <link rel="stylesheet" href="<?php echo plugins_url('styles.css', __FILE__); ?>">

        <?php
    }


// Hook into the wp_head to ensure the assets are loaded globally
add_action('wp_head', 'inject_threejs_assets', 0);

// function create_scene_shortcode($post_id)
function create_scene_shortcode($atts)
{
  $atts = shortcode_atts(array(
        'id' => get_the_ID(),
        'width' => '100%',  // Default width is 1000px
        'height' => '500px', // Default height is 500px
    ), $atts);
    $post_id = intval($atts['id']);
    $scene_data = get_scene_data($post_id);
    ob_start();

    ?>

    <!-- <h1>Scene Below</h1> -->
    <div id="scene-<?php echo esc_attr($post_id); ?>-<?php echo uniqid(); ?>" class="codes_scene" data-scene-id="<?php echo esc_attr($post_id); ?>" style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;"></div>
    <script type="module">
      import { initializeThreeJsScene } from "<?php echo plugins_url('scene.js', __FILE__); ?>";
      const sceneData = <?php echo json_encode($scene_data); ?>;
      const containerID = "threejs-scene-container-<?php echo esc_js($post_id); ?>";
      // Get all elements with the same class
      // const containers = document.querySelectorAll('.codes_scene');
      const containers = document.querySelectorAll('[data-scene-id="<?php echo esc_js($post_id); ?>"]');  // Replace 287 with the desired scene ID

      containers.forEach((container) => {
          const containerID = container.id;

          // Check if the scene has already been initialized for this container
          if (!container.hasAttribute('data-scene-initialized')) {
              container.setAttribute('data-scene-initialized', 'true');

              // Initialize the Three.js scene
              console.log(sceneData);
              if (typeof initializeThreeJsScene === "function") {
                  initializeThreeJsScene(sceneData, containerID);
              }
          } else {
              console.log(`Scene for ${containerID} has already been initialized.`);
          }
      });
    </script>


    <?php
    return ob_get_clean();
}
add_shortcode('codes_scene', 'create_scene_shortcode');

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


// function codes_scene_enqueue_assets() {
//     // Register the styles and scripts
//     wp_register_style('codes_scene_styles', plugins_url('styles.css', __FILE__));
//     wp_register_script('codes_scene_importmap', '', [], null, false); // Placeholder for the importmap
//     wp_register_script('codes_scene_shims', 'https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js', [], null, false);
// }
// add_action('wp_enqueue_scripts', 'codes_scene_enqueue_assets');
//
//
// function codes_scene_maybe_enqueue($posts) {
//     if (is_singular() && has_shortcode(get_post_field('post_content', get_the_ID()), 'codes_scene')) {
//         // Enqueue styles and scripts if the shortcode is found
//         wp_enqueue_style('codes_scene_styles');
//         wp_enqueue_script('codes_scene_shims');
//
//         // Inline the importmap script
//         wp_add_inline_script(
//             'codes_scene_importmap',
//             '
//             <script type="importmap">
//               {
//                 "imports": {
//                   "three": "https://unpkg.com/three@0.150.1/build/three.module.js",
//                   "three/addons/": "https://unpkg.com/three@0.150.1/examples/jsm/"
//                 }
//               }
//             </script>
//             ',
//             'before'
//         );
//     }
// }
// add_action('wp_enqueue_scripts', 'codes_scene_maybe_enqueue');


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
    // MUST MATCH THE name ATTRIBUTE
    $fields = [
        'threejs_pos_x',
        'threejs_pos_y',
        'threejs_pos_z',
        'threejs_rot_x',
        'threejs_rot_y',
        'threejs_rot_z',
        'scale',
        'threejs_model_url',
        'ambient_light_intensity',
        // Mouse Animation Strength
        'mouseRotationX',
        'mouseRotationY',
        'mouseRotationZ',

        // Scroll Animation Strength
        'scrollMoveX',
        'scrollMoveY',
        'scrollMoveZ',

        // Animation Toggles
        'mouseAnimationLink',
        'scrollAnimationLink'

    ];

    foreach ($fields as $field) {

      if (isset($_POST[$field])) {
          update_post_meta($post_id, $field, $_POST[$field]); // Save the value from the form
      } else {
          update_post_meta($post_id, $field, ''); // Save empty if not checked or not set, stops non saving when not checked
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



// function hide_content_editor_in_posts() {
//     $post_type = 'scene'; // Replace with the post type you want to target
//     remove_post_type_support($post_type, 'editor');
// }
// add_action('init', 'hide_content_editor_in_posts');



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

  $scene_data = get_scene_data($post->ID);

  $model_url = $scene_data['modelUrl'];
  $pos_x = $scene_data['positionX'];
  $pos_y = $scene_data['positionY'];
  $pos_z = $scene_data['positionZ'];
  $rot_x = $scene_data['rotationX'];
  $rot_y = $scene_data['rotationY'];
  $rot_z = $scene_data['rotationZ'];
  $scale = $scene_data['scale'];
  $light_intensity = $scene_data['lightIntensity'];


  // Mouse Rotation Strength
  $mouse_rot_x = $scene_data['mouseRotationX'];
  // $mouse_rot_x = isset($scene_data['mouseRotationX']) ? $scene_data['mouseRotationX'] : '';
  $mouse_rot_y = isset($scene_data['mouseRotationY']) ? $scene_data['mouseRotationY'] : '';
  $mouse_rot_z = isset($scene_data['mouseRotationZ']) ? $scene_data['mouseRotationZ'] : '';

  // Scroll Camera Movement
  $scroll_mov_x = isset($scene_data['scrollMoveX']) ? $scene_data['scrollMoveX'] : '';
  $scroll_mov_y = isset($scene_data['scrollMoveY']) ? $scene_data['scrollMoveY'] : '';
  $scroll_mov_z = isset($scene_data['scrollMoveZ']) ? $scene_data['scrollMoveZ'] : '';

  // Animation Toggles
  $mouse_enabled = isset($scene_data['mouseAnimationLink']) ? $scene_data['mouseAnimationLink'] : '';
  $scroll_enabled = isset($scene_data['scrollAnimationLink']) ? $scene_data['scrollAnimationLink'] : '';

  $shortcode = '[codes_scene id="' . $post->ID . '"]';


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
        <link rel='stylesheet' href='<?php echo plugins_url('styles.css', __FILE__); ?>'>



        <!-- <h1>3D Model Editor</h1> -->

        <div id="threejs-canvas" style="width: 1000px; height: 500px;"></div>



        <!-- <button id="save-model-data">Save Changes</button> -->


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





      <!-- <h1>NEW</h1> -->

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
        <strong>Scale: </strong><input type="number" name="scale" id="codes_scale" value="<?php echo esc_attr($scale); ?>" step="0.01" />

      </p>



      <p>
          <label for="ambient-light-slider">Light Intensity:</label><br>
          <input type="range" name="ambient_light_intensity" id="ambient-light-slider" min="0" max="3" step="0.05" value="<?php echo esc_attr($light_intensity); ?>" />
          <span id="light_intensity_value"><?php echo esc_attr($light_intensity); ?></span>
      </p>

      <!-- Mouse Animation Link -->
      <label for="mouseAnimationLink">Enable Mouse Animation</label>
      <input type="checkbox" name="mouseAnimationLink" id="mouseAnimationLink" <?php checked($mouse_enabled, 'on'); ?>>

    <!-- Mouse Rotation Strength -->
    <fieldset>
      <legend>Mouse Rotation Strength</legend>
      <label for="mouseRotationX">X:</label>
      <input type="number" name="mouseRotationX" id="mouseRotationX" step="1" value="<?php echo esc_attr($mouse_rot_x); ?>">

      <label for="mouseRotationY">Y:</label>
      <input type="number" name="mouseRotationY" id="mouseRotationY" step="1" value="<?php echo esc_attr($mouse_rot_y); ?>">

      <label for="mouseRotationZ">Z:</label>
      <input type="number" name="mouseRotationZ" id="mouseRotationZ" step="1" value="<?php echo esc_attr($mouse_rot_z); ?>">
    </fieldset>

    <!-- Scroll Animation Link -->
    <label for="scrollAnimationLink">Enable Scroll Animation</label>
    <input type="checkbox" name="scrollAnimationLink" id="scrollAnimationLink" <?php checked($scroll_enabled, 'on'); ?>>

    <!-- Scroll Camera Movement -->
    <fieldset>
      <legend>Scroll Camera Movement</legend>
      <label for="scrollMoveX">X:</label>
      <input type="number" name="scrollMoveX" id="scrollMoveX" step="0.01" value="<?php echo esc_attr($scroll_mov_x); ?>">

      <label for="scrollMoveY">Y:</label>
      <input type="number" name="scrollMoveY" id="scrollMoveY" step="0.01" value="<?php echo esc_attr($scroll_mov_y); ?>">

      <label for="scrollMoveZ">Z:</label>
      <input type="number" name="scrollMoveZ" id="scrollMoveZ" step="0.01" value="<?php echo esc_attr($scroll_mov_z); ?>">
    </fieldset>



      <p>Use this shortcode to display the scene on your site:</p>
      <textarea readonly style="width: 100%;"><?php echo esc_html($shortcode); ?></textarea>


      <script>
        // Pass PHP data to JavaScript
        const sceneData = <?php echo json_encode($scene_data); ?>;
        console.log('Three.js Transform Data:', sceneData);
      </script>
      <script type="module" src="<?php echo plugins_url('admin.js', __FILE__); ?>"></script>


    </div>
    <?php
}
