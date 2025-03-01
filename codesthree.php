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
        'lightIntensity' => get_post_meta($post_id, 'ambient_light_intensity', true) ?: 0,
        'mouseRotationX' => get_post_meta($post_id, 'mouseRotationX', true) ?: 5,
        'mouseRotationY' => get_post_meta($post_id, 'mouseRotationY', true) ?: 5,
        'mouseRotationZ' => get_post_meta($post_id, 'mouseRotationZ', true) ?: 0,
        'scrollMoveX' => get_post_meta($post_id, 'scrollMoveX', true) ?: 0,
        'scrollMoveY' => get_post_meta($post_id, 'scrollMoveY', true) ?: 0,
        'scrollMoveZ' => get_post_meta($post_id, 'scrollMoveZ', true) ?: 0,
        'mouseAnimationLink' => get_post_meta($post_id, 'mouseAnimationLink', true) ?: '',
        'scrollAnimationLink' => get_post_meta($post_id, 'scrollAnimationLink', true) ?: '',
        'loopActive' => get_post_meta($post_id, 'loopActive', true) ?: '',
        'loopCountX' => get_post_meta($post_id, 'loopCountX', true) ?: 3,
        'loopCountY' => get_post_meta($post_id, 'loopCountY', true) ?: 3,
        'loopCountZ' => get_post_meta($post_id, 'loopCountZ', true) ?: 3,
        'itemSpacing' => get_post_meta($post_id, 'itemSpacing', true) ?: 1.0,
        'isOrthoCamera' => get_post_meta($post_id, 'isOrthoCamera', true) ?: '',
        'lightIntensity' => get_post_meta($post_id, 'lightIntensity', true) ?: 1.0,
        'lightPosX' => get_post_meta($post_id, 'lightPosX', true) ?: 0,
        'lightPosY' => get_post_meta($post_id, 'lightPosY', true) ?: 10,
        'lightPosZ' => get_post_meta($post_id, 'lightPosZ', true) ?: 0,
        'useEnvLight' => get_post_meta($post_id, 'useEnvLight', true) === '1',
        'loopGroupScale' => get_post_meta($post_id, 'loopGroupScale', true) ?: 1.0,



        'postID' => $post_id ?: 'no post id'
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
        'width' => '100%',  // Default width is 100%
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
    if (is_singular('codes_scene')) { // Check if the current post type is 'scene'
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
// add_action('wp_enqueue_scripts', 'threejs_enqueue_scene_scripts');

// add_action('init', 'threejs_enqueue_scene_scripts');




// Hook to initialize the custom post type
add_action('init', 'codesthree_register_scenes_post_type');

function codesthree_register_scenes_post_type() {
    // Labels for the post type
    $labels = array(
        'name'               => __('Codes Scenes', 'codesthree'),
        'singular_name'      => __('Codes Scene', 'codesthree'),
        'menu_name'          => __('Code 3 Scenes ', 'codesthree'),
        'name_admin_bar'     => __('Codes Scene', 'codesthree'),
        'add_new'            => __('Add New Scene', 'codesthree'),
        'add_new_item'       => __('Add New Scene', 'codesthree'),
        'edit_item'          => __('Edit Scene', 'codesthree'),
        'new_item'           => __('New Codes Scene', 'codesthree'),
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
        'menu_icon'          => 'dashicons-visibility',
        'supports'           => array('title', 'editor', 'thumbnail'),
        'rewrite'           => ['slug' => 'codes_scene', 'with_front' => false],
        'has_archive'       => true,
        'query_var'         => true,
        'show_in_rest'       => true, // Enable Gutenberg editor
    );

    // Register the post type
    register_post_type('codes_scene', $args);
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
    if (get_post_type($post_id) !== 'codes_scene') {
        return;
    }

    // // Verify nonce and user permissions
    if (
        !isset($_POST['scene_meta_nonce']) ||
        !wp_verify_nonce($_POST['scene_meta_nonce'], 'save_scene_metadata')
    ) {
        return;
    }

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
        'scrollAnimationLink',

        'loopActive',
        'loopCountX',
        'loopCountY',
        'loopCountZ',
        'itemSpacing',
        'isOrthoCamera',

        'lightIntensity',
        'lightPosX',
        'lightPosY',
        'lightPosZ',
        'useEnvLight',
        'loopGroupScale'

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
        'codes_scene',                // Post type where the meta box will appear
        'normal',               // Context (normal, side, or advanced)
        'default'               // Priority
    );
}
add_action('add_meta_boxes', 'threejs_add_editor_meta_box');


function remove_post_editing_box() {
    remove_post_type_support('codes_scene', 'editor');
}
add_action('init', 'remove_post_editing_box');


function custom_codes_scene_template_redirect($template) {

// 	error_log('dir' . plugin_dir_path(__DIR__));
//     error_log('file ' . plugin_dir_path(__FILE__) . 'single_scene.php');
// 	$current_post_type = get_post_type();
// 	error_log("Not codes_scene. Current post type: " . $current_post_type);

	if (is_singular('codes_scene')) {
		return plugin_dir_path(__FILE__) . 'templates/single_scene.php';
    }
    return $template;
}
add_filter('template_include', 'custom_codes_scene_template_redirect');

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


  $loop_active = $scene_data['loopActive'] ? $scene_data['loopActive'] : '';
  $loop_count_x = $scene_data['loopCountX'];
  $loop_count_y = $scene_data['loopCountY'];
  $loop_count_z = $scene_data['loopCountZ'];
  $item_spacing = $scene_data['itemSpacing'];


  $is_ortho_camera = $scene_data['isOrthoCamera'] ? $scene_data['isOrthoCamera'] : '';

  $shortcode = '[codes_scene id="' . $post->ID . '"]';

  $light_intensity = $scene_data['lightIntensity'];
  $light_pos_x = $scene_data['lightPosX'];
  $light_pos_y = $scene_data['lightPosY'];
  $light_pos_z = $scene_data['lightPosZ'];
  $use_env_light = $scene_data['useEnvLight'];
  $loop_group_scale = $scene_data['loopGroupScale'];


  wp_nonce_field('save_scene_metadata', 'scene_meta_nonce');
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

      <div id="newScenePopup">
        Upload/open a model to get started
        <button type="button" class="button" id="popup_media_button">Select Model</button>
      </div>
        <div id="threejs-canvas" style="width: 100%; height: 70vh;"></div>
        <!-- <div id="codes_controls"> -->
          <div class='topTransforms'>

              <button type="button" onmousedown="setTransformMode('translate')">Translate (T)</button>
              <button type="button" onmousedown="setTransformMode('rotate')">Rotate (R)</button>
              <button id='codesScaleButton' title="not available in loop mode, use scale text input on left" type="button" onmousedown="setTransformMode('scale')">Scale (S)</button>
          </div>
          <div class='leftControls'>



            <strong>Position</strong>
            <div class="transform-group">
              <div class="transform-field">
                  <label for="threejs_position_x">X</label>
                  <input type="number" name="threejs_pos_x" id="threejs_position_x" value="<?php echo esc_attr($pos_x); ?>" step="0.01">
              </div>
              <div class="transform-field">
                  <label for="threejs_position_y">Y</label>
                  <input type="number" name="threejs_pos_y" id="threejs_position_y" value="<?php echo esc_attr($pos_y); ?>" step="0.01">
              </div>
              <div class="transform-field">
                  <label for="threejs_position_z">Z</label>
                  <input type="number" name="threejs_pos_z" id="threejs_position_z" value="<?php echo esc_attr($pos_z); ?>" step="0.01">
              </div>
            </div>

            <strong>Rotation</strong>
            <div class="transform-group">
              <div class="transform-field">
                  <label for="threejs_rotation_x">X</label>
                  <input type="number" name="threejs_rot_x" id="threejs_rotation_x" value="<?php echo esc_attr($rot_x); ?>" step="0.01">
              </div>
              <div class="transform-field">
                  <label for="threejs_rotation_y">Y</label>
                  <input type="number" name="threejs_rot_y" id="threejs_rotation_y" value="<?php echo esc_attr($rot_y); ?>" step="0.01">
              </div>
              <div class="transform-field">
                  <label for="threejs_rotation_z">Z</label>
                  <input type="number" name="threejs_rot_z" id="threejs_rotation_z" value="<?php echo esc_attr($rot_z); ?>" step="0.01">
              </div>
            </div>

            <p>
              <strong>Scale (model): </strong><input type="number" name="scale" id="codes_scale" value="<?php echo esc_attr($scale); ?>" step="0.01" />
            </p>

            <hr>

            <p>
                <label for="ambient-light-slider">Light Intensity:</label><br>
                <input type="range" name="ambient_light_intensity" id="ambient-light-slider" max="3" step="0.05" value="<?php echo esc_attr($light_intensity); ?>" />
                <span id="light_intensity_value"><?php echo esc_attr($light_intensity); ?></span>
            </p>

            <!-- Directional Light Intensity -->
            <label>Light Intensity: <input type="number" name="lightIntensity" id="lightIntensity" step="0.1" value="<?php echo esc_attr($light_intensity); ?>"></label>

            <!-- Directional Light Position -->
            <div class="transform-group">
              <div class="transform-field">
                  <label for="lightPosX">X</label>
                  <input type="number" name="lightPosX" id="lightPosX" step="0.1" value="<?php echo esc_attr($light_pos_x); ?>">
              </div>
              <div class="transform-field">
                  <label for="lightPosY">Y</label>
                  <input type="number" name="lightPosY" id="lightPosY" step="0.1" value="<?php echo esc_attr($light_pos_y); ?>">
              </div>
              <div class="transform-field">
                  <label for="lightPosZ">Z</label>
                  <input type="number" name="lightPosZ" id="lightPosZ" step="0.1" value="<?php echo esc_attr($light_pos_z); ?>">
              </div>
            </div>

            <label>
                <input type="checkbox" name="useEnvLight" id="useEnvLight" <?php checked($use_env_light, true); ?>>
                Use Environment Light (HDR)
            </label>

            <hr>

            <!-- Toggle for isOrthoCamera -->
            <label>
                <input type="checkbox" name="isOrthoCamera" id="isOrthoCamera" <?php checked($is_ortho_camera, 'on'); ?>>
                Use Orthographic Camera
            </label>
          </div>


          <div class='rightControls'>


            <!-- Mouse Animation Link -->
            <div class="checkbox-group">
              <input type="checkbox" name="mouseAnimationLink" id="mouseAnimationLink" <?php checked($mouse_enabled, 'on'); ?>>
              <label for="mouseAnimationLink">Enable Mouse Animation</label>
            </div>
            <!-- Mouse Rotation Strength -->
            <fieldset>
                <legend>Mouse Rotation Strength</legend>
                <div class="transform-group">
                    <div class="transform-field">
                        <label for="mouseRotationX">X</label>
                        <input type="number" name="mouseRotationX" id="mouseRotationX" step="1" value="<?php echo esc_attr($mouse_rot_x); ?>">
                    </div>
                    <div class="transform-field">
                        <label for="mouseRotationY">Y</label>
                        <input type="number" name="mouseRotationY" id="mouseRotationY" step="1" value="<?php echo esc_attr($mouse_rot_y); ?>">
                    </div>
                    <div class="transform-field">
                        <label for="mouseRotationZ">Z</label>
                        <input type="number" name="mouseRotationZ" id="mouseRotationZ" step="1" value="<?php echo esc_attr($mouse_rot_z); ?>">
                    </div>
                </div>
            </fieldset>

            <hr>
            <!-- Scroll Animation Link -->
            <div class="checkbox-group">
                <input type="checkbox" name="scrollAnimationLink" id="scrollAnimationLink" <?php checked($scroll_enabled, 'on'); ?>>
                <label for="scrollAnimationLink">Enable Scroll Animation</label>
            </div>

            <!-- Scroll Camera Movement -->
            <fieldset>
                <legend>Scroll Camera Movement</legend>
                <div class="transform-group">
                    <div class="transform-field">
                        <label for="scrollMoveX">X</label>
                        <input type="number" name="scrollMoveX" id="scrollMoveX" step="0.01" value="<?php echo esc_attr($scroll_mov_x); ?>">
                    </div>
                    <div class="transform-field">
                        <label for="scrollMoveY">Y</label>
                        <input type="number" name="scrollMoveY" id="scrollMoveY" step="0.01" value="<?php echo esc_attr($scroll_mov_y); ?>">
                    </div>
                    <div class="transform-field">
                        <label for="scrollMoveZ">Z</label>
                        <input type="number" name="scrollMoveZ" id="scrollMoveZ" step="0.01" value="<?php echo esc_attr($scroll_mov_z); ?>">
                    </div>
                </div>
            </fieldset>

            <hr>
            <!-- Toggle for Activating Loop -->
            <label>
              <input type="checkbox" name="loopActive" id="loopActive" <?php checked($loop_active, 'on'); ?>>
              Activate Loop
            </label>

            <!-- Loop Count -->
            <fieldset>
                <legend>Loop Count</legend>
                <div class="transform-group">
                    <div class="transform-field">
                        <label for="loopCountX">X Count</label>
                        <input type="number" name="loopCountX" id="loopCountX" step="1" value="<?php echo esc_attr($loop_count_x); ?>">
                    </div>
                    <div class="transform-field">
                        <label for="loopCountY">Y Count</label>
                        <input type="number" name="loopCountY" id="loopCountY" step="1" value="<?php echo esc_attr($loop_count_y); ?>">
                    </div>
                    <div class="transform-field">
                        <label for="loopCountZ">Z Count</label>
                        <input type="number" name="loopCountZ" id="loopCountZ" step="1" value="<?php echo esc_attr($loop_count_z); ?>">
                    </div>
                </div>
            </fieldset>
            <label>Loop Group Scale: <input type="number" name="loopGroupScale" id="loopGroupScale" step="0.1" value="<?php echo esc_attr($loop_group_scale); ?>"></label>



          <!-- Number Input for Spacing -->
          <label>Item Spacing: <input type="number" name="itemSpacing" id="itemSpacing" step="0.1" value="<?php echo esc_attr($item_spacing); ?>"></label>






          </div>

          <p>Use this shortcode to display the scene on your site:</p>
          <textarea readonly style="width: 100%;"><?php echo esc_html($shortcode); ?></textarea>


          <hr>

          <input type="hidden" id="threejs_model_url" name="threejs_model_url" value="<?php echo esc_url($model_url); ?>" />
          <button type="button" class="button" id="threejs_model_url_button">Change Model</button>
          <p id="threejs_model_url_preview">
              <?php if ($model_url): ?>
                  Current Model: <a href="<?php echo esc_url($model_url); ?>" target="_blank"><?php echo esc_url($model_url); ?></a>
              <?php endif; ?>
          </p>

        <!-- </div> -->


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



      <script>
        // Pass PHP data to JavaScript
        const sceneData = <?php echo json_encode($scene_data); ?>;
        console.log('Three.js Transform Data:', sceneData);
      </script>
      <script type="module" src="<?php echo plugins_url('admin.js', __FILE__); ?>"></script>


    </div>
    <?php
}
