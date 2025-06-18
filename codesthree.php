<?php
/*
Plugin Name: Code Three 3D Interactive
Description: Easy 3D/3JS scenes. Take WordPress to the next dimension. 
Version: 1.0
Author: Kauri Beguely
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function get_scene_data($post_id) {
    // Define the meta key where the full JSON configuration is stored
    $db_meta_key = '_threejs_scene_config_data';

    // Attempt to retrieve the saved configuration array
    // get_post_meta automatically deserializes the stored array/object if it was saved that way.
    $saved_config = get_post_meta($post_id, $db_meta_key, true);

    // Provide default values if no configuration has been saved yet or if it's invalid.
    if (empty($saved_config) || !is_array($saved_config)) {
        // Define a comprehensive default structure matching your JS sceneData expectation
        $default_config = [
            'globalSettings' => [
                'ambientLightIntensity'     => 0.5,
                'directionalLightIntensity' => 1.0,
                'lightPosX'                 => 5,
                'lightPosY'                 => 10,
                'lightPosZ'                 => 7.5,
                'useEnvLight'               => false, // Assuming this is a toggle ('on'/'off')
                'isOrthoCamera'             => false, // Assuming this is a toggle ('on'/'off')
                'mouseAnimationLink'        => false,
                'mouseRotationX'            => 6.0,
                'mouseRotationY'            => 6.0,
                'mouseRotationZ'            => 0.0,
                'scrollAnimationLink'       => false,
                'scrollMoveX'               => 0.0,
                'scrollMoveY'               => 5.0,
                'scrollMoveZ'               => 0.0,
                'breakpoint'               => 768,
                // Add any other global default settings here
            ],
            'models' => [
                // Start with an empty array if no models are saved
                // Or you could add a default cube/model config here if your scene always starts with one
                [],
                []
                
            ]
        ];
        return $default_config;
    }

    // If data was found, ensure it has the expected top-level keys
    // This helps handle cases where old data structures might exist or are incomplete.
    $final_config = [
        'globalSettings' => $saved_config['globalSettings'] ?? [], // Provide empty array if missing
        'models'         => $saved_config['models'] ?? [],       // Provide empty array if missing
    ];

    // Merge with defaults for any missing nested keys in globalSettings or model properties if necessary
    // For example, if a new global setting was added after some posts were saved
    $final_config['globalSettings'] = array_merge([
        'ambientLightIntensity'     => 0.5,
        'directionalLightIntensity' => 1.0,
        'lightPosX'                 => 5,
        'lightPosY'                 => 10,
        'lightPosZ'                 => 7.5,
        'useEnvLight'               => false,
        'isOrthoCamera'             => false,
        'mouseAnimationLink'        => false,
        'mouseRotationX'            => 0.0,
        'mouseRotationY'            => 0.0,
        'mouseRotationZ'            => 0.0,
        'scrollAnimationLink'       => false,
        'scrollMoveX'               => 0.0,
        'scrollMoveY'               => 0.0,
        'scrollMoveZ'               => 0.0,
        'scrollMoveZ'               => 0.0,
        'breakpoint'               => 768,
    ], $final_config['globalSettings']);
   return $final_config;
}

function inject_threejs_assets() 
{
?>

        <!-- <script type="importmap">
            {
                "imports": {
                    "three": "https://unpkg.com/three@0.150.1/build/three.module.js",
                    "three/addons/": "https://unpkg.com/three@0.150.1/examples/jsm/"
                }
            }
        </script> -->

<script type="importmap">
    {
        "imports": {
            "three": "<?php echo esc_url(plugins_url('js/threemin.module.js', __FILE__)); ?>",
            "three/addons/": "<?php echo esc_url(plugins_url('js/threeaddons/', __FILE__)); ?>"
        }
    }
</script>

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

    // Enqueue JS
    // wp_enqueue_script_module(
    //     'codes-script',
    //     plugins_url('scene.js', __FILE__),
    // );

    ?>

    <!-- <h1>Scene Below</h1> -->
    <div id="scene-<?php echo esc_attr($post_id); ?>-<?php echo esc_attr(uniqid()); ?>" class="codes_scene" data-scene-id="<?php echo esc_attr($post_id); ?>" style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;">
      <div class = "loadScreen">
        <div class = "loadCircle">
          <div class = "loadInnerCircle">
          </div>
        </div>
      </div>

    </div>

    <script type="module">
      import { initializeThreeJsScene } from "<?php echo esc_url(plugins_url('scene.js', __FILE__)); ?>";
      const allSceneData = <?php echo json_encode($scene_data); ?>;
      const pluginUrl = "<?php echo esc_url(plugins_url())?>";
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
            //   console.log(sceneData);
              if (typeof initializeThreeJsScene === "function") {
                  initializeThreeJsScene(allSceneData, containerID, pluginUrl);
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
            plugins_url('es-module-shims'),
            'js/es-module-shims.js',
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

function admin_enqueue_assets() {
    
    // Enqueue es-module-shims
    wp_enqueue_script_module(
        'es-module',
        plugins_url('js/es-module-shims.js', __FILE__),
    );

    // Enqueue CSS
    wp_enqueue_style(
        'coedes-admin-styles',
        plugins_url('styles.css', __FILE__),
    );

    // Enqueue JS
    wp_enqueue_script_module(
        'codes-admin-script',
        plugins_url('admin.js', __FILE__)
    );
}
add_action('admin_enqueue_scripts', 'admin_enqueue_assets');

function frontend_enqueue_assets() {
    // Enqueue CSS
    wp_enqueue_style(
        'coedes-styles',
        plugins_url('styles.css', __FILE__),
    );
}
add_action('wp_enqueue_scripts', 'frontend_enqueue_assets');





// Hook to initialize the custom post type
add_action('init', 'codesthree_register_scenes_post_type');

function codesthree_register_scenes_post_type() {
    // Labels for the post type
    $labels = array(
        'name'               => __('Code  Three Scenes', 'codesthree'),
        'singular_name'      => __('Code Three Scene', 'codesthree'),
        'menu_name'          => __('Code 3 Scenes ', 'codesthree'),
        'name_admin_bar'     => __('Code 3 Scene', 'codesthree'),
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


function save_scene_metadata($post_id) {

    // Verify this is a "codes_scene" post type
    if (get_post_type($post_id) !== 'codes_scene') {
        return;
    }

    // Verify nonce for security (comes from your meta box form)
    if ( isset( $_POST['scene_meta_nonce'] ) ) {
        $nonce = sanitize_text_field(wp_unslash( $_POST['scene_meta_nonce'] )); // Unslash first
        // $nonce = sanitize_text_field( $nonce );

        if ( ! wp_verify_nonce( $nonce, 'save_scene_metadata' ) ) {
            return;
        }
    } 
    else 
    {
        return;
    }

    // Verify user permissions
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    $frontend_json_field_name = 'threejs_scene_config_json';

    $db_meta_key = '_threejs_scene_config_data'; // Using a leading underscore makes it a hidden meta key

    if (isset($_POST[$frontend_json_field_name])) {
        $json_string = sanitize_text_field(wp_unslash($_POST[$frontend_json_field_name]));

        $decoded_data = json_decode($json_string, true);

        // 4. --- Validate Decoded Data ---

        // Check if JSON decoding was successful and if the result is an array
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_data)) {
            update_post_meta($post_id, $db_meta_key, $decoded_data);
        } else {
            // Optionally, delete any existing valid meta to clear the config if invalid data is submitted.
            delete_post_meta($post_id, $db_meta_key);
        }
    } else {
        // 5. --- Handle Case: No JSON Data Submitted ---
        delete_post_meta($post_id, $db_meta_key);
        }
}
add_action('save_post', 'save_scene_metadata');

// Add meta box for 3D Element Editor in Scene post type
function threejs_add_editor_meta_box() {
    add_meta_box(
        'code_three_metabox', // Meta box ID
        'Code Three Scene Editor',    // Meta box title
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
        echo '[codes_scene id="' . absint($post_id) . '"]';
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
    // $globalSettings = get_scene_data($post->ID); // This function now returns the structure with 'allModels' array inside it.
    $full_meta = get_scene_data($post->ID);
    $globalSettings = $full_meta['globalSettings']; // This function now returns the structure with 'allModels' array inside it.
    $all_models = $full_meta['models']; // Get the array of all models
    // --- Global Scene Settings ---
    // These are still direct properties of $globalSettings
    $is_ortho_camera = $globalSettings['isOrthoCamera'] ?: '';

    // Light settings (global)
    $directional_light_intensity = $globalSettings['directionalLightIntensity'];
    // $ambient_light_intensity = $globalSettings['lightIntensity']; // Renamed for clarity in PHP variables
    $light_intensity = $globalSettings['ambientLightIntensity'];
    $light_pos_x = $globalSettings['lightPosX'];
    $light_pos_y = $globalSettings['lightPosY'];
    $light_pos_z = $globalSettings['lightPosZ'];
    $use_env_light = $globalSettings['useEnvLight'] ?: '';


    // Mouse Rotation Strength (global)
    $mouse_rot_x = $globalSettings['mouseRotationX'];
    $mouse_rot_y = $globalSettings['mouseRotationY'];
    $mouse_rot_z = $globalSettings['mouseRotationZ'];

    // Scroll Camera Movement (global)
    $scroll_mov_x = $globalSettings['scrollMoveX'];
    $scroll_mov_y = $globalSettings['scrollMoveY'];
    $scroll_mov_z = $globalSettings['scrollMoveZ'];

    $breakpoint = $globalSettings['breakpoint'];

    // Animation Toggles (global)
    $mouse_enabled = $globalSettings['mouseAnimationLink'] ?: '';
    $scroll_enabled = $globalSettings['scrollAnimationLink'] ?: '';

    $current_model_data = array(); 
    $current_model_data = end($all_models);


    // Now, extract the specific values for the current model (the last one, or defaults)
    $pos_x = isset($current_model_data['positionX']) ? round($current_model_data['positionX'], 2) : 0.0;
    $pos_y = isset($current_model_data['positionY']) ? round($current_model_data['positionY'], 2) : 0.0;
    $pos_z = isset($current_model_data['positionZ']) ? round($current_model_data['positionZ'], 2) : 0.0;
    $rot_x = isset($current_model_data['rotationX']) ? round($current_model_data['rotationX'], 2) : 0.0;
    $rot_y = isset($current_model_data['rotationY']) ? round($current_model_data['rotationY'], 2) : 0.0;
    $rot_z = isset($current_model_data['rotationZ']) ? round($current_model_data['rotationZ'], 2) : 0.0;
    $scale = isset($current_model_data['scale']) ? round($current_model_data['scale'], 2) : 1.0;

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
    
    // --- Shortcode (if you're using it to display the scene) ---
    $shortcode = '[codes_scene id="' . $post->ID . '"]'; // Still uses the current post ID

  // Output the form
    ?>
    <!-- start HTMLs -->
    <div id="threejs-editor-container">
        <script type="importmap">
            {
                "imports": {
                    "three": "<?php echo esc_url(plugins_url('/js/threemin.module.js', __FILE__)); ?>",
                    "three/addons/": "<?php echo esc_url(plugins_url('/js/threeaddons/', __FILE__)); ?>"
                }
            }
        </script>
       

        <input type="hidden"
            name="threejs_scene_config_json"
            id="threejs_scene_config_json"
            value=""> <?php wp_nonce_field('save_scene_metadata', 'scene_meta_nonce'); ?>

        <!-- <h1>3D Model Editor</h1> -->


        <div id="mobileOutline"></div>

      <div id="newScenePopup">
        Upload/open a model to get started
        <button type="button" class="button" id="popup_media_button">Select Model</button>
      </div>
        <div id="threejs-canvas" style="width: 100%; height: var(--canvas-height);"></div>
        <!-- <div id="codes_controls"> -->
            <div class='topTransforms'>

                <button class='transModeButton' id="btnTranslateMode" type="button" onmousedown="setTransformMode('translate', event, this)">Translate (T)</button>
                <button class='transModeButton' id="btnRotateMode" type="button" onmousedown="setTransformMode('rotate', event,  this)">Rotate (R)</button>
                <button class='transModeButton' id='codesScaleButton' title="not available in loop mode, use scale text input on left" type="button" onmousedown="setTransformMode('scale', event, this)">Scale (Y)</button>
            </div>

            <div style="display: flex; justify-content: center;">
                <button id="toggleControls" type="button">Toggle Controls</button>
                <button id="toggleGizmo" type="button">Gizmo</button>
            </div>

          <div class='leftControls'>
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

            <p style="margin:0px">
                <label for="ambient-light-slider">Ambient Intensity:</label><br>
                <input type="range" name="ambient_light_intensity" id="ambient_light_intensity" max="3" step="0.05" value="<?php echo esc_attr($light_intensity); ?>" />
                <span id="light_intensity_value"><?php echo esc_attr($light_intensity); ?></span>
            </p>

            <!-- Directional Light Intensity -->
            <p style="margin:0px">
              <label>Directional Intensity: <input type="range" name="directionalLightIntensity" id="directionalLightIntensity" max="3" step="0.05" value="<?php echo esc_attr($directional_light_intensity); ?>"></label>
              <span id="directional_intensity_value"><?php echo esc_attr($directional_light_intensity); ?></span>
            </p>
            <!-- Directional Light Position -->
            <label>Directional Light Position</label>
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

            <hr>

            <!-- Toggle for isOrthoCamera -->
            <label>Breakpoint (px)
                <input id="breakPoint" type="number" value="<?php echo esc_attr($breakpoint); ?>">
            </label>

            <button id="mobileMode" type="button">Mobile</button>

          </div>


          <div class='rightControls'>

            <div id="objectListContainer" style="padding: 10px;max-height: 90%;overflow-y: auto;z-index: 100;border: 1px solid #2271b1;border-radius: 3px;">    <strong>Scene Objects</strong>
                <ul id="sceneObjectList" style="list-style: none; padding: 0; margin: 0;">
                </ul>
            </div>

            <button type="button" class="button" id="add_model_button" >Add Model</button>
            <div class="transform-group">
                <button style="width: 50%;" type="button" class="button" id="delete_model_button">Delete</button>
                <button style="width: 50%;" type="button" class="button" id="btn_duplicate">Clone</button>
            </div>
            
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
            <!-- Toggle for Activating Loop -->
             <div id="loopComingSoon" style="display:none">
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
          </div>

          <p>Use this shortcode to display the scene on your site:</p>
          <textarea readonly style="width: 100%;"><?php echo esc_html($shortcode); ?></textarea>


          <hr>

          <input type="hidden" id="threejs_model_url" name="threejs_model_url" value="<?php echo esc_url($model_url); ?>" />
          <button type="button" class="button" id="threejs_model_url_button" style="display:none">Change Model</button>
          <p id="threejs_model_url_preview">
              <?php if ($model_url): ?>
                  Current Model: <a href="<?php echo esc_url($model_url); ?>" target="_blank"><?php echo esc_url($model_url); ?></a>
              <?php endif; ?>
          </p>

      <script>
        // Pass PHP data to JavaScript
        const allSceneData = <?php echo json_encode($full_meta); ?>;
        console.log('Three.js Transform Data:', allSceneData);
      </script>

    </div>
    <?php
}
