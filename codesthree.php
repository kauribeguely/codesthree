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


// function get_scene_data($post_id) {
//     return array(
//         'modelUrl' => get_post_meta($post_id, 'threejs_model_url', true) ?: "",
//         'positionX' => get_post_meta($post_id, 'threejs_pos_x', true) ?: 0,
//         'positionY' => get_post_meta($post_id, 'threejs_pos_y', true) ?: 0,
//         'positionZ' => get_post_meta($post_id, 'threejs_pos_z', true) ?: 0,
//         'rotationX' => get_post_meta($post_id, 'threejs_rot_x', true) ?: 0,
//         'rotationY' => get_post_meta($post_id, 'threejs_rot_y', true) ?: 0,
//         'rotationZ' => get_post_meta($post_id, 'threejs_rot_z', true) ?: 0,
//         'scale' => get_post_meta($post_id, 'scale', true) ?: 1,
//         'lightIntensity' => get_post_meta($post_id, 'ambient_light_intensity', true) ?: 0,
//         'mouseRotationX' => get_post_meta($post_id, 'mouseRotationX', true) ?: 0,
//         'mouseRotationY' => get_post_meta($post_id, 'mouseRotationY', true) ?: 0,
//         'mouseRotationZ' => get_post_meta($post_id, 'mouseRotationZ', true) ?: 0,
//         'scrollMoveX' => get_post_meta($post_id, 'scrollMoveX', true) ?: 0,
//         'scrollMoveY' => get_post_meta($post_id, 'scrollMoveY', true) ?: 0,
//         'scrollMoveZ' => get_post_meta($post_id, 'scrollMoveZ', true) ?: 0,
//         'mouseAnimationLink' => get_post_meta($post_id, 'mouseAnimationLink', true) ?: '',
//         'scrollAnimationLink' => get_post_meta($post_id, 'scrollAnimationLink', true) ?: '',
//         'loopActive' => get_post_meta($post_id, 'loopActive', true) ?: '',
//         'loopCountX' => get_post_meta($post_id, 'loopCountX', true) ?: 3,
//         'loopCountY' => get_post_meta($post_id, 'loopCountY', true) ?: 3,
//         'loopCountZ' => get_post_meta($post_id, 'loopCountZ', true) ?: 3,
//         'itemSpacing' => get_post_meta($post_id, 'itemSpacing', true) ?: 1.0,
//         'isOrthoCamera' => get_post_meta($post_id, 'isOrthoCamera', true) ?: '',
//         'directionalLightIntensity' => get_post_meta($post_id, 'directionalLightIntensity', true),
//         // 'directionalLightIntensity' => get_post_meta($post_id, 'directionalLightIntensity', true) ?: 0,
//         'lightPosX' => get_post_meta($post_id, 'lightPosX', true) ?: 0,
//         'lightPosY' => get_post_meta($post_id, 'lightPosY', true) ?: 0,
//         'lightPosZ' => get_post_meta($post_id, 'lightPosZ', true) ?: 0,
//         'useEnvLight' => get_post_meta($post_id, 'useEnvLight', true) ?: '',
//         'loopGroupScale' => get_post_meta($post_id, 'loopGroupScale', true) ?: 1.0,



//         'postID' => $post_id ?: 'no post id'
//     );
// }

function get_scene_data($post_id) {
    // --- STATIC ALL MODELS ARRAY FOR TESTING ---
    $all_models_array = array(
        array(
            'modelId'           => 'test_model_1',
            'modelUrl'          => 'http://localhost/wpLocalEdge/wp-content/uploads/2025/06/a.glb', // REMEMBER TO CHANGE THIS TO A VALID URL
            'positionX'         => -0.5,
            'positionY'         => 0.0,
            'positionZ'         => 0.0,
            'rotationX'         => 0.0,
            'rotationY'         => 45.0, // Rotated to see it better
            'rotationZ'         => 0.0,
            'scale'             => 0.8,
            'modelName'         => 'Test Model A (Single)',
            'loopActive'        => '', // No loop
            'loopCountX'        => 1,
            'loopCountY'        => 1,
            'loopCountZ'        => 1,
            'loopItemSpacingX'  => 0.0,
            'loopItemSpacingY'  => 0.0,
            'loopItemSpacingZ'  => 0.0,
            'loopGroupScale'    => 1.0,
        ),
        array(
            'modelId'           => 'test_model_2',
            'modelUrl'          => 'http://localhost/wpLocalEdge/wp-content/uploads/2025/06/a.glb', // REMEMBER TO CHANGE THIS TO A VALID URL
            'positionX'         => 0.0,
            'positionY'         => 1.0, // Placed higher
            'positionZ'         => 0.0,
            'rotationX'         => 0.0,
            'rotationY'         => 0.0,
            'rotationZ'         => 0.0,
            'scale'             => 0.5,
            'modelName'         => 'Test Model B (Row of 3)',
            'loopActive'        => 'on', // Loop active
            'loopCountX'        => 3,    // 3 items in X
            'loopCountY'        => 1,
            'loopCountZ'        => 1,
            'loopItemSpacingX'  => 1.5,  // Spaced out
            'loopItemSpacingY'  => 0.0,
            'loopItemSpacingZ'  => 0.0,
            'loopGroupScale'    => 1.0,
        ),
        array(
            'modelId'           => 'test_model_3',
            'modelUrl'          => 'http://localhost/wpLocalEdge/wp-content/uploads/2025/06/a.glb', // REMEMBER TO CHANGE THIS TO A VALID URL
            'positionX'         => -2.0,
            'positionY'         => -1.0, // Placed lower and left
            'positionZ'         => 0.0,
            'rotationX'         => 0.0,
            'rotationY'         => 0.0,
            'rotationZ'         => 0.0,
            'scale'             => 0.4,
            'modelName'         => 'Test Model C (2x2 Grid)',
            'loopActive'        => 'on', // Loop active
            'loopCountX'        => 2,    // 2 items in X
            'loopCountY'        => 2,    // 2 items in Y
            'loopCountZ'        => 1,
            'loopItemSpacingX'  => 1.2,
            'loopItemSpacingY'  => 1.2,
            'loopItemSpacingZ'  => 0.0,
            'loopGroupScale'    => 1.0,
        ),
        // Add more test models here as needed!
    );
    // --- END STATIC ALL MODELS ARRAY FOR TESTING ---


    // --- Global Scene Settings (still fetched from post meta) ---
    $is_ortho_camera = get_post_meta($post_id, 'is_ortho_camera', true) ?: '';
    $directional_light_intensity = get_post_meta($post_id, 'directional_light_intensity', true) ?: 0.0;
    $ambient_light_intensity = get_post_meta($post_id, 'ambient_light_intensity', true) ?: 0.0;
    $light_pos_x = get_post_meta($post_id, 'light_pos_x', true) ?: 0.0;
    $light_pos_y = get_post_meta($post_id, 'light_pos_y', true) ?: 0.0;
    $light_pos_z = get_post_meta($post_id, 'light_pos_z', true) ?: 0.0;
    $use_env_light = get_post_meta($post_id, 'use_env_light', true) ?: '';

    // Global Interaction Settings
    $mouse_animation_link = get_post_meta($post_id, 'mouse_animation_link', true) ?: '';
    $mouse_rotation_x = get_post_meta($post_id, 'mouse_rotation_x', true) ?: 0.0;
    $mouse_rotation_y = get_post_meta($post_id, 'mouse_rotation_y', true) ?: 0.0;
    $mouse_rotation_z = get_post_meta($post_id, 'mouse_rotation_z', true) ?: 0.0;
    $scroll_animation_link = get_post_meta($post_id, 'scroll_animation_link', true) ?: '';
    $scroll_move_x = get_post_meta($post_id, 'scroll_move_x', true) ?: 0.0;
    $scroll_move_y = get_post_meta($post_id, 'scroll_move_y', true) ?: 0.0;
    $scroll_move_z = get_post_meta($post_id, 'scroll_move_z', true) ?: 0.0;

    // --- Return Combined Scene Data ---
    return array(
        'isOrthoCamera'             => $is_ortho_camera,
        'directionalLightIntensity' => (float)$directional_light_intensity,
        'lightIntensity'            => (float)$ambient_light_intensity,
        'lightPosX'                 => (float)$light_pos_x,
        'lightPosY'                 => (float)$light_pos_y,
        'lightPosZ'                 => (float)$light_pos_z,
        'useEnvLight'               => $use_env_light,

        'mouseAnimationLink'        => $mouse_animation_link,
        'mouseRotationX'            => (float)$mouse_rotation_x,
        'mouseRotationY'            => (float)$mouse_rotation_y,
        'mouseRotationZ'            => (float)$mouse_rotation_z,
        'scrollAnimationLink'       => $scroll_animation_link,
        'scrollMoveX'               => (float)$scroll_move_x,
        'scrollMoveY'               => (float)$scroll_move_y,
        'scrollMoveZ'               => (float)$scroll_move_z,

        // The static array of all models
        'allModels'                 => $all_models_array,

        'postID'                    => $post_id,
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
    <div id="scene-<?php echo esc_attr($post_id); ?>-<?php echo uniqid(); ?>" class="codes_scene" data-scene-id="<?php echo esc_attr($post_id); ?>" style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;">
      <div class = "loadScreen">
        <div class = "loadCircle">
          <div class = "loadInnerCircle">
          </div>
        </div>
      </div>

    </div>

    <script type="module">
      import { initializeThreeJsScene } from "<?php echo plugins_url('scene.js', __FILE__); ?>";
      const sceneData = <?php echo json_encode($scene_data); ?>;
      const pluginUrl = "<?php echo plugins_url()?>";
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
                  initializeThreeJsScene(sceneData, containerID, pluginUrl);
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

        'directionalLightIntensity',
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


function add_codes_scene_shortcode_column($columns) {
    $columns['codes_scene_shortcode'] = 'Shortcode';
    return $columns;
}
add_filter('manage_codes_scene_posts_columns', 'add_codes_scene_shortcode_column'); // Replace 'your_custom_post_type'

function populate_codes_scene_shortcode_column($column, $post_id) {
    if ($column === 'codes_scene_shortcode') {
        echo '[codes_scene id="' . $post_id . '"]';
    }
}
add_action('manage_codes_scene_posts_custom_column', 'populate_codes_scene_shortcode_column', 10, 2); // Replace 'your_custom_post_type'


function set_default_one_column_layout($default, $option, $value) {
    $screen = get_current_screen();

    if ($screen && $screen->id === 'codes_scene') {
        return 1; // Set to 1 column
    }

    return $default;
}
add_filter('default_option_screen_layout_codes_scene', 'set_default_one_column_layout', 10, 3); // Replace your_custom_post_type


// Admin page content
function threejs_editor_page($post) {

  // Assuming $post->ID is available here
    $scene_data = get_scene_data($post->ID); // This function now returns the structure with 'allModels' array inside it.


    $all_models = $scene_data['allModels']; // Get the array of all models
    // --- Global Scene Settings ---
    // These are still direct properties of $scene_data
    $is_ortho_camera = $scene_data['isOrthoCamera'] ?: '';

    // Light settings (global)
    $directional_light_intensity = $scene_data['directionalLightIntensity'];
    // $ambient_light_intensity = $scene_data['lightIntensity']; // Renamed for clarity in PHP variables
    $light_intensity = $scene_data['lightIntensity'];
    $light_pos_x = $scene_data['lightPosX'];
    $light_pos_y = $scene_data['lightPosY'];
    $light_pos_z = $scene_data['lightPosZ'];
    $use_env_light = $scene_data['useEnvLight'] ?: '';


    // Mouse Rotation Strength (global)
    $mouse_rot_x = $scene_data['mouseRotationX'];
    $mouse_rot_y = $scene_data['mouseRotationY'];
    $mouse_rot_z = $scene_data['mouseRotationZ'];

    // Scroll Camera Movement (global)
    $scroll_mov_x = $scene_data['scrollMoveX'];
    $scroll_mov_y = $scene_data['scrollMoveY'];
    $scroll_mov_z = $scene_data['scrollMoveZ'];

    // Animation Toggles (global)
    $mouse_enabled = $scene_data['mouseAnimationLink'] ?: '';
    $scroll_enabled = $scene_data['scrollAnimationLink'] ?: '';

    $current_model_data = array(); 
    $current_model_data = end($all_models);


    // Now, extract the specific values for the current model (the last one, or defaults)
    $pos_x = isset($current_model_data['positionX']) ? $current_model_data['positionX'] : 0.0;
    $pos_y = isset($current_model_data['positionY']) ? $current_model_data['positionY'] : 0.0;
    $pos_z = isset($current_model_data['positionZ']) ? $current_model_data['positionZ'] : 0.0;
    $rot_x = isset($current_model_data['rotationX']) ? $current_model_data['rotationX'] : 0.0;
    $rot_y = isset($current_model_data['rotationY']) ? $current_model_data['rotationY'] : 0.0;
    $rot_z = isset($current_model_data['rotationZ']) ? $current_model_data['rotationZ'] : 0.0;
    $scale = isset($current_model_data['scale']) ? $current_model_data['scale'] : 1.0;

    // You would do this for all other model-specific fields like modelUrl, loopActive, etc.
    $model_url = isset($current_model_data['modelUrl']) ? $current_model_data['modelUrl'] : '';
    $loop_active = isset($current_model_data['loopActive']) ? $current_model_data['loopActive'] : '';
    $loop_count_x = isset($current_model_data['loopCountX']) ? $current_model_data['loopCountX'] : 1;
    $loop_count_y = isset($current_model_data['loopCountY']) ? $current_model_data['loopCountY'] : 1;
    $loop_count_z = isset($current_model_data['loopCountZ']) ? $current_model_data['loopCountZ'] : 1;
    $item_spacing_x = isset($current_model_data['loopItemSpacingX']) ? $current_model_data['loopItemSpacingX'] : 0.0;
    $item_spacing_y = isset($current_model_data['loopItemSpacingY']) ? $current_model_data['loopItemSpacingY'] : 0.0;
    $item_spacing_z = isset($current_model_data['loopItemSpacingZ']) ? $current_model_data['loopItemSpacingZ'] : 0.0;
    $loop_group_scale = isset($current_model_data['loopGroupScale']) ? $current_model_data['loopGroupScale'] : 1.0;
    $model_name = isset($current_model_data['modelName']) ? $current_model_data['modelName'] : '';

    // --- Model-Specific Data (NOT extracted individually here) ---
    // The 'allModels' array contains all the model-specific data,
    // including their individual positions, rotations, scales, and loop options.
    // This entire array will be passed to JavaScript.
    // No need to extract individual model properties like modelUrl, positionX,
    // loopActive, loopCountX, itemSpacing, loopGroupScale here.
    // These will be accessed within the JavaScript's loop over sceneData.allModels.

    // --- Other Global Data ---
    $post_id_from_scene_data = $scene_data['postID']; // You might already have $post->ID, but good for consistency

    // --- Shortcode (if you're using it to display the scene) ---
    $shortcode = '[codes_scene id="' . $post->ID . '"]'; // Still uses the current post ID



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
          <button id="toggleControls" type="button">Toggle Controls</button>
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
                <label for="ambient-light-slider">Ambient Intensity:</label><br>
                <input type="range" name="ambient_light_intensity" id="ambient_light_intensity" max="3" step="0.05" value="<?php echo esc_attr($light_intensity); ?>" />
                <span id="light_intensity_value"><?php echo esc_attr($light_intensity); ?></span>
            </p>

            <!-- Directional Light Intensity -->
            <p>
              <label>Directional Intensity: <input type="range" name="directionalLightIntensity" id="directionalLightIntensity" max="3" step="0.05" value="<?php echo esc_attr($directional_light_intensity); ?>"></label>
              <span id="directional_intensity_value"><?php echo esc_attr($directional_light_intensity); ?></span>
            </p>
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
                <input type="checkbox" name="useEnvLight" id="useEnvLight" <?php checked($use_env_light, 'on'); ?>>
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
            <!-- Number Input for Spacing -->
            <label>Item Spacing: <input type="number" name="itemSpacing" id="itemSpacing" step="0.1" value="0.5"></label>
            <!-- <label>Item Spacing: <input type="number" name="itemSpacing" id="itemSpacing" step="0.1" value="<?php echo esc_attr($item_spacing); ?>"></label> -->
            <label>Loop Group Scale: <input type="number" name="loopGroupScale" id="loopGroupScale" step="0.01" value="<?php echo esc_attr($loop_group_scale); ?>"></label>



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
