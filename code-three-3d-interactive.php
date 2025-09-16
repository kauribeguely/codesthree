<?php
/*
Plugin Name: Code Three 3D Interactive
Description: Easy 3D/3JS scenes. Take WordPress to the next dimension. 
Version: 1.0
Author: Kauri Beguely
Text Domain: code-three-3d-interactive
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: 1.0.0
*/

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

register_uninstall_hook( __FILE__, 'c33d_on_plugin_uninstall' );
 
function c33d_on_plugin_uninstall() {
    // Define the option name to be deleted
    $option_name_to_clear = 'c33d_imported_assets'; // Or 'c33d_imported_demo_assets' if that's the final name

    // Delete the option completely from the wp_options table
    $deleted = delete_option( $option_name_to_clear );

    // TODO - give user option to..
    // - Delete custom post types (if you registered them and want them gone on uninstall)
    // - Delete custom database tables created by your plugin
    // - Delete any custom files/directories created by your plugin (e.g. media library)
}

function c33d_create_scene_shortcode($atts)
{
    $atts = shortcode_atts(array(
        'id' => get_the_ID(),
        'width' => '100%',  // Default width is 100%
        'height' => '500px', // Default height is 500px
    ), $atts);
    $post_id = intval($atts['id']);
    $scene_data = c33d_get_scene_data($post_id);
    $isadmin = is_admin();
    ob_start(); 
    ?>

    <div id="scene-<?php echo esc_attr($post_id); ?>-<?php echo esc_attr(uniqid()); ?>" 
        class="c33d_scene" 
        data-scene-id="<?php echo esc_attr($post_id); ?>" 
        data-scene-data='<?php echo wp_json_encode($scene_data); ?>'
        data-plugin-url='<?php echo esc_url(plugins_url('', __FILE__))?>'
        data-is-admin="<?php echo esc_attr($isadmin ? 'true' : 'false'); ?>"
        style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;">

        <div class = "loadScreen">
            <div class = "cubeLoader">
            </div>
            <!-- <div class = "loadCircle">
                <div class = "loadInnerCircle">
                </div>
            </div> -->
        </div>
    </div>

    <?php
    return ob_get_clean();
}
add_shortcode('c33d_scene', 'c33d_create_scene_shortcode');

//register to enqueue later, didnt end up working
function c33d_register_frontend_assets()
{
    $plugin_version = 1.0;
    wp_register_style(
        'codes-styles',
        plugins_url('/assets/css/styles.css', __FILE__)
    );

    wp_register_script_module(
        'codes-scene-script', 
        plugins_url('/assets/js/scene.js', __FILE__)
    );


}
add_action('wp_enqueue_scripts', 'c33d_register_frontend_assets', 5);


function c33d_frontend_enqueue_assets() {

        wp_enqueue_style('codes-styles');
        
        wp_enqueue_script(
            'c33d-local-script', 
            plugins_url('/assets/js/local.js', __FILE__), 
            true 
        );
        
        $is_admin_string = 'false'; 

        if ( is_admin() ) {
            $is_admin_string = 'true';
        }

        if ( isset( $_GET['action'] ) && sanitize_text_field( wp_unslash( $_GET['action'] ) ) === 'elementor' ) {
            $is_admin_string = 'true';
        }

        // $is_admin_string = is_admin() ? 'true' : 'false';
        // $is_admin_string = (is_admin() || ( defined( 'ELEMENTOR_PATH' ) && \Elementor\Plugin::$instance->editor->is_edit_mode() ) ) ? 'true' : 'false';
        // $is_admin_string = (is_admin() || $_GET['action'] === 'elementor' ) ? 'true' : 'false';
        // $is_admin_string = (is_admin() || $_GET['action'] === 'elementor') ? 'true' : 'false';
        wp_localize_script(
            'c33d-local-script',
            'c33dlocaliseddata',     
            array(
                'isAdmin' => 'true',
                'pluginUrl' => esc_url(plugins_url('', __FILE__)),
                )
            );
            
        wp_enqueue_script_module('codes-scene-script');
}
add_action('wp_enqueue_scripts', 'c33d_frontend_enqueue_assets', 6);


function c33d_admin_enqueue_assets() {


    global $post; 
    $screen = get_current_screen(); 
    $is_code_scene = false;

    if (
        ( 'post' === $screen->base || 'post-new' === $screen->base ) && 
        isset( $post->post_type ) &&                                  
        'c33d_scene' === $post->post_type                            
    ) {
        $is_code_scene = true;
    }
    // Add more conditions if also needed on other custom admin pages:
    // For a top-level admin page created with add_menu_page():
    // else if ( 'toplevel_page_your_custom_admin_page_slug' === $hook ) {
    //     $is_code_scene = true;
    // }
    // For a sub-menu admin page created with add_submenu_page():
    // else if ( 'parent_menu_slug_page_your_sub_menu_page_slug' === $hook ) {
    //     $is_code_scene = true;
    // }


    if ( ! $is_code_scene ) {
        return; 
    }


    // Enqueue CSS
    wp_enqueue_style(
        'coedes-admin-styles',
        plugins_url('/assets/css/styles.css', __FILE__),
    );


    wp_enqueue_script(
        'c33d-local-script', 
        plugins_url('/assets/js/local.js', __FILE__), 
        true 
    );

    wp_localize_script(
        'c33d-local-script',
        'c33dadminlocaliseddata',     
        array(
            'ajax_url' => admin_url('admin-ajax.php'), 
            'ajax_nonce'    => wp_create_nonce('c33d_local_ajax_nonce'), 
            'allSceneData' => wp_json_encode(c33d_get_scene_data($post->ID)),
            'pluginUrl' => esc_url(plugins_url('', __FILE__)),
            'importedDemoAssets'  => wp_json_encode( get_option( 'c33d_imported_assets', array() ) ),
        )
    );

    // Enqueue JS
    wp_enqueue_script_module(
        'codes-admin-script',
        plugins_url('/assets/js/admin.js', __FILE__),
        array( 'c33d-local-script' ) // Your main module depends on the data script
        
    );
}
add_action('admin_enqueue_scripts', 'c33d_admin_enqueue_assets');

function c33d_plugin_row_meta( $links, $file ) {

    if ( plugin_basename( __FILE__ ) === $file ) {
        $new_scene_link = '<a href="' . esc_url( admin_url( 'post-new.php?post_type=c33d_scene' ) ) . '">' . esc_html__( 'New Scene', 'code-three-3d-interactive' ) . '</a>';

        $view_demo_link = '<a href="' . esc_url( 'https://c33d.kaurib.com/' ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'View Demo', 'code-three-3d-interactive' ) . '</a>';

        $links[] = $new_scene_link;
        $links[] = $view_demo_link;
    }
    

    return $links;
}
add_filter( 'plugin_row_meta', 'c33d_plugin_row_meta', 10, 2 );


function c33d_shortcode_in_publish_box() {
    global $post;

    if ($post->post_type !== 'c33d_scene') return;

    $shortcode = '[c33d_scene id="' . $post->ID . '"]';

    echo '<input type="text" readonly value="' . esc_attr($shortcode) . '" style="width:100%; background:#f9f9f9; cursor:text;" onclick="this.select()" />';
}
add_action('post_submitbox_misc_actions', 'c33d_shortcode_in_publish_box');

function c33d_get_scene_data($post_id) {
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

function c33d_inject_threejs_assets() 
{
?>

<script type="importmap">
    {
        "imports": {
            "three": "<?php echo esc_url(plugins_url('/assets/js/three.module.min.js', __FILE__)); ?>",
            "three/addons/": "<?php echo esc_url(plugins_url('/assets/js/threeaddons/', __FILE__)); ?>"
        }
    }
</script>

<?php
}
// Hook into the wp_head to ensure the assets are loaded globally
add_action('wp_head', 'c33d_inject_threejs_assets', 0);



// Add support for .glb and .gltf files in the Media Library
function c33d_allow_3d_file_uploads($mime_types) {
    $mime_types['glb'] = 'model/gltf-binary'; 
    $mime_types['gltf'] = 'model/gltf+json';  
    return $mime_types;
}
add_filter('upload_mimes', 'c33d_allow_3d_file_uploads');


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
            $data['type'] = 'model/gltf-binary';
        }
    }

    return $data;
}, 10, 5);






// Hook to initialize the custom post type
add_action('init', 'c33d_register_scenes_post_type');

function c33d_register_scenes_post_type() {
    // Labels for the post type
    $labels = array(
        'name'               => __('Scenes', 'code-three-3d-interactive'),
        'singular_name'      => __('Scene', 'code-three-3d-interactive'),
        'menu_name'          => 'Code Three', 
        'name_admin_bar'     => __('Scene', 'code-three-3d-interactive'),
        'all_items'          => __('All 3D Scenes', 'code-three-3d-interactive'),
        'add_new'            => __('New 3D Scene', 'code-three-3d-interactive'),
        'add_new_item'       => __('New 3D Scene', 'code-three-3d-interactive'),
        'edit_item'          => __('Edit Scene', 'code-three-3d-interactive'),
        'new_item'           => __('New Scene', 'code-three-3d-interactive'), // Keep 'Code 3' fixed
        'view_item'          => __('View Scene', 'code-three-3d-interactive'),
        'search_items'       => __('Search Scenes', 'code-three-3d-interactive'),
        'not_found'          => __('No scenes found', 'code-three-3d-interactive'),
        'not_found_in_trash' => __('No scenes found in Trash', 'code-three-3d-interactive'),
    );

    // Arguments for the post type
    $args = array(
        'labels'             => $labels,
        'public'             => true,
        'show_in_menu'       => true,
        'menu_icon'          => 'dashicons-visibility',
        'supports'           => array('title', 'editor', 'thumbnail'),
        'rewrite'           => ['slug' => 'c33d_scene', 'with_front' => false],
        'has_archive'       => true,
        'query_var'         => true,
        'show_in_rest'       => true, // Enable Gutenberg editor
    );

    // Register the post type
    register_post_type('c33d_scene', $args);
    //Same thing as permalinks refresh
    flush_rewrite_rules();
}


function c33d_save_scene_metadata($post_id) {

    // Verify this is a "c33d_scene" post type
    if (get_post_type($post_id) !== 'c33d_scene') {
        return;
    }

    // Verify nonce for security (comes from your meta box form)
    if ( isset( $_POST['scene_meta_nonce'] ) ) {
        $nonce = sanitize_text_field(wp_unslash( $_POST['scene_meta_nonce'] )); // Unslash first
        // $nonce = sanitize_text_field( $nonce );
        if ( ! wp_verify_nonce( $nonce, 'c33d_save_scene_data_nonce' ) ) {
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

    $db_meta_key = '_threejs_scene_config_data'; // Using a leading underscore makes it a hidden meta key

    if (isset($_POST['threejs_scene_config_json'])) { 
        $json_string = sanitize_text_field(wp_unslash($_POST['threejs_scene_config_json']));

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
add_action('save_post', 'c33d_save_scene_metadata');

// Add meta box for 3D Element Editor in Scene post type
function c33d_add_editor_meta_box() {
    add_meta_box(
        'code-three-metabox', // Meta box ID
        'Code Three Scene Editor',    // Meta box title
        'c33d_editor_page', // Callback function to render the content
        'c33d_scene',                // Post type where the meta box will appear
        'normal',               // Context (normal, side, or advanced)
        'default'               // Priority
    );
}
add_action('add_meta_boxes', 'c33d_add_editor_meta_box');


function c33d_remove_post_editing_box() {
    remove_post_type_support('c33d_scene', 'editor');
}
add_action('init', 'c33d_remove_post_editing_box');


function c33d_custom_template_redirect($template) {

	if (is_singular('c33d_scene')) {
		return plugin_dir_path(__FILE__) . 'templates/single_scene.php';
    }
    return $template;
}
add_filter('template_include', 'c33d_custom_template_redirect');


function c33d_add_shortcode_column($columns) {
    $columns['c33d_scene_shortcode'] = 'Shortcode';
    return $columns;
}
add_filter('manage_c33d_scene_posts_columns', 'c33d_add_shortcode_column'); 

function c33d_populate_shortcode_column($column, $post_id) {
    if ($column === 'c33d_scene_shortcode') {
        echo '[c33d_scene id="' . absint($post_id) . '"]';
    }
}
add_action('manage_c33d_scene_posts_custom_column', 'c33d_populate_shortcode_column', 10, 2); 


function c33d_set_default_one_column_layout($default, $option, $value) {
    $screen = get_current_screen();

    if ($screen && $screen->id === 'c33d_scene') {
        return 1; // Set to 1 column
    }

    return $default;
}
add_filter('default_option_screen_layout_c33d_scene', 'c33d_set_default_one_column_layout', 10, 3); 


add_action( 'wp_ajax_c33d_download_asset', 'c33d_download_asset' );


// function c33d_handle_demo_import_ajax() {
function c33d_download_asset() {
    if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'c33d_local_ajax_nonce' ) ) {
        wp_send_json_error( array( 'message' => 'Security check failed. Invalid nonce.' ) );
        wp_die(); // Always exit after sending JSON response in AJAX handlers
    }

    //TODO: if downloading to media library run upload permission check
    // if ( ! current_user_can( 'upload_files' ) ) {
    //     wp_send_json_error( array( 'message' => 'You do not have permission to import files.' ) );
    //     wp_die();
    // }

    $asset_name    = isset( $_POST['asset_name'] ) ? sanitize_text_field( wp_unslash( $_POST['asset_name'] ) ) : ''; 
    $download_type = isset( $_POST['download_type'] ) ? sanitize_text_field( wp_unslash( $_POST['download_type'] ) ) : '';

    // Basic validation of inputs
    if (empty( $asset_name ) ) {
        wp_send_json_error( array( 'message' => 'Missing Asset Name' ) );
        wp_die();
    }

    $base_url = '';
    $file_extension = '';

    // Determine the base URL and file extension based on download type and asset name
    switch ( $download_type ) {
        case 'model':
            $base_url = 'https://c33d.kaurib.com/dl/models/';
            $file_extension = '.glb'; // Assuming all models are GLB for now
            // You could have a more complex mapping here if different models have different extensions:
            // $model_extensions = ['phone' => '.glb', 'laptop' => '.glb', 'car' => '.fbx'];
            // $file_extension = $model_extensions[$asset_name] ?? '.glb';
            break;
        case 'envtexture':
            $base_url = 'https://c33d.kaurib.com/dl/envtextures/'; // Assuming a separate folder for env textures
            $file_extension = '.hdr'; // Assuming all environment textures are HDR
            break;
        case 'scene':
            $base_url = 'https://c33d.kaurib.com/dl/scenes/';
            $file_extension = '.json'; // Scene configurations are JSON
            break;
        default:
            wp_send_json_error( array( 'message' => 'Invalid download type specified.' ) );
            wp_die();
    }

    // Construct the full external URL
    $file_url = esc_url_raw( $base_url . $asset_name . $file_extension ); 
    // This prevents your server from being used to download files from arbitrary URLs.
    // $allowed_domains = array( 'c33d.kaurib.com' ); // Add all domains your demos are hosted on.
    // $parsed_url = wp_parse_url( $file_url );
    // if ( ! isset( $parsed_url['host'] ) || ! in_array( $parsed_url['host'], $allowed_domains, true ) ) {
    //     wp_send_json_error( array( 'message' => 'File URL is not from an allowed source.' ) );
    //     wp_die();
    // }

    // Dispatch based on download type
    switch ( $download_type ) {
        case 'model':
        case 'envtexture':
            // Handle importing to Media Library
            $result = c33d_handle_media_sideload( $file_url, $asset_name, $download_type );
            if ( is_wp_error( $result ) ) {
                wp_send_json_error( array( 'message' => $result->get_error_message(), 'errors' => $result->get_error_data() ) );
            } else {

                $imported_assets = get_option( 'c33d_imported_assets', array() );
                $imported_assets[ $asset_name ] = array(
                    'attachment_id'  => $result['attachment_id'],
                    'attachment_url' => $result['attachment_url'],
                    'type'           => $download_type,
                );
                update_option( 'c33d_imported_assets', $imported_assets );


                wp_send_json_success( array(
                    'modelName' => $asset_name, 
                    'asset'     => array( 
                        'message'          => sprintf( '%s "%s" imported successfully!', ucwords($download_type), $asset_name ),
                        'attachment_id'  => $result['attachment_id'],
                        'attachment_url' => $result['attachment_url'],
                        'type'           => $download_type,
                    )
                ) );
            }
            break;

        case 'scene':
            // Handle fetching and returning JSON content
            $result = c33d_handle_scene_json_fetch( $file_url, $asset_name );
            if ( is_wp_error( $result ) ) {
                wp_send_json_error( array( 'message' => $result->get_error_message(), 'errors' => $result->get_error_data() ) );
            } else {
                wp_send_json_success( array(
                    'message'          => sprintf( 'Scene "%s" configuration fetched successfully!', $asset_name ),
                    'scene_data'       => $result['scene_data'],
                    'asset_name_requested' => $asset_name,
                ) );
            }
            break;

        default:
            // This case should ideally not be reached due to earlier switch, but as a fallback
            wp_send_json_error( array( 'message' => 'Unhandled download type.' ) );
            break;
    }

    wp_die(); // Always terminate script execution
}

function c33d_handle_media_sideload( $file_url, $asset_id, $download_type ) {
    // Include WordPress core media handling functions
    require_once( ABSPATH . 'wp-admin/includes/file.php' );
    require_once( ABSPATH . 'wp-admin/includes/image.php' );
    require_once( ABSPATH . 'wp-admin/includes/media.php' );

    // Download the file to a temporary location
    $tmp_file = download_url( $file_url );

    if ( is_wp_error( $tmp_file ) ) {
        return new WP_Error( 'download_failed', 'Failed to download file from external source.', $tmp_file->get_error_message() );
    }

    // Prepare the file array for media_handle_sideload()
    $file_array = array(
        'name'     => basename( $file_url ),
        'tmp_name' => $tmp_file,
    );

    // Attempt to determine MIME type more accurately based on asset_type or extension
    $mime_type = '';
    $extension = pathinfo( $file_array['name'], PATHINFO_EXTENSION );
    switch ( strtolower( $extension ) ) {
        case 'glb':
        case 'gltf':
            $mime_type = 'model/gltf-binary'; // GLB is binary, GLTF might be JSON, but this is common for both
            break;
        case 'hdr':
            $mime_type = 'image/vnd.radiance';
            break;
        case 'obj':
            $mime_type = 'model/obj';
            break;
        // Add other specific MIME types as needed
        default:
            // Let WordPress try to determine, or default to application/octet-stream
            $mime_type = '';
            break;
    }
    if ( ! empty( $mime_type ) ) {
        $file_array['type'] = $mime_type;
    }

    // Sideload the file into the Media Library
    $attachment_id = media_handle_sideload( $file_array, 0, sprintf( 'Imported %s: %s', ucwords($download_type), $asset_id ) );

    // Clean up the temporary file
    wp_delete_file( $file_array['tmp_name'] );
    // @unlink( $file_array['tmp_name'] );

    if ( is_wp_error( $attachment_id ) ) {
        return new WP_Error( 'sideload_failed', 'Failed to import file to Media Library.', $attachment_id->get_error_message() );
    }

    return array(
        'attachment_id'  => $attachment_id,
        'attachment_url' => wp_get_attachment_url( $attachment_id ),
    );
}


function c33d_handle_scene_json_fetch( $scene_url, $asset_id ) {
    $response = wp_remote_get( $scene_url );

    if ( is_wp_error( $response ) ) {
        return new WP_Error( 'fetch_failed', 'Failed to fetch scene configuration from external URL.', $response->get_error_message() );
    }

    $json_string = wp_remote_retrieve_body( $response );
    $decoded_scene_data = json_decode( $json_string, true );

    if ( json_last_error() !== JSON_ERROR_NONE ) {
        return new WP_Error( 'json_decode_failed', 'Failed to decode scene configuration JSON.', json_last_error_msg() );
    }

    return array(
        'scene_data' => $decoded_scene_data,
    );
}

// Admin page content
function c33d_editor_page($post) {

  // Assuming $post->ID is available here
    $full_meta = c33d_get_scene_data($post->ID);
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


    $pos_x = isset($current_model_data['positionX']) ? round($current_model_data['positionX'], 2) : 0.0;
    $pos_y = isset($current_model_data['positionY']) ? round($current_model_data['positionY'], 2) : 0.0;
    $pos_z = isset($current_model_data['positionZ']) ? round($current_model_data['positionZ'], 2) : 0.0;
    $rot_x = isset($current_model_data['rotationX']) ? round($current_model_data['rotationX'], 2) : 0.0;
    $rot_y = isset($current_model_data['rotationY']) ? round($current_model_data['rotationY'], 2) : 0.0;
    $rot_z = isset($current_model_data['rotationZ']) ? round($current_model_data['rotationZ'], 2) : 0.0;
    $scale_x = isset($current_model_data['scaleX']) ? round($current_model_data['scaleX'], 2) : 1.0;
    $scale_y = isset($current_model_data['scaleY']) ? round($current_model_data['scaleY'], 2) : 1.0;
    $scale_z = isset($current_model_data['scaleZ']) ? round($current_model_data['scaleZ'], 2) : 1.0;

    $model_url = isset($current_model_data['modelUrl']) ? $current_model_data['modelUrl'] : '';
    $loop_active = isset($current_model_data['loopActive']) ? $current_model_data['loopActive'] : false;
    $loop_count_x = isset($current_model_data['loopCountX']) ? $current_model_data['loopCountX'] : 1;
    $loop_count_y = isset($current_model_data['loopCountY']) ? $current_model_data['loopCountY'] : 1;
    $loop_count_z = isset($current_model_data['loopCountZ']) ? $current_model_data['loopCountZ'] : 1;
    $item_spacing_x = isset($current_model_data['loopItemSpacingX']) ? $current_model_data['loopItemSpacingX'] : 0.0;
    $item_spacing_y = isset($current_model_data['loopItemSpacingY']) ? $current_model_data['loopItemSpacingY'] : 0.0;
    $item_spacing_z = isset($current_model_data['loopItemSpacingZ']) ? $current_model_data['loopItemSpacingZ'] : 0.0;
    $loop_group_scale = isset($current_model_data['loopGroupScale']) ? $current_model_data['loopGroupScale'] : 1.0;
    $model_name = isset($current_model_data['modelName']) ? $current_model_data['modelName'] : '';
    
    // --- Shortcode (if you're using it to display the scene) ---
    $shortcode = '[c33d_scene id="' . $post->ID . '"]'; // Still uses the current post ID

    $pluginUrl = plugins_url('', __FILE__);

  // Output the form
    ?>
    <!-- start HTMLs -->
    <div id="c33d-editor">
        <script type="importmap">
            {
                "imports": {
                    "three": "<?php echo esc_url(plugins_url('/assets/js/three.module.min.js', __FILE__)); ?>",
                    "three/addons/": "<?php echo esc_url(plugins_url('/assets//js/threeaddons/', __FILE__)); ?>"
                }
            }
        </script>
       

        <input type="hidden"
            name="threejs_scene_config_json"
            id="threejs_scene_config_json"
            value=""> 
        <?php wp_nonce_field('c33d_save_scene_data_nonce', 'scene_meta_nonce'); ?>

        <!-- <h1>3D Model Editor</h1> -->


        <div id="mobileOutline"></div>

        <div id="newScenePopup">
            <!-- Left Side: Upload/Open Model Section -->
            <div class="left-side">
                <!-- <div class="modal-content"> -->



                        <!-- Demo Objects Section -->
                        <section class='demo-models'>
                            <h2>Add a model</h2>
                            <h3>Demos</h3>
                            <div class="demo-grid demo-three-column">
                                <!-- Demo Object 1: Phone -->
                                <div class="demo-grid-item c33-download"
                                    data-asset-name="phone" 
                                    data-download-type="model">
                                    <img src="<?php echo esc_url($pluginUrl . '/assets/img/phone.jpg'); ?>" alt="Demo Phone">
                                    
                                    <div class='c3_button_with_text'>
                                        <h4>Phone</h4>
                                        <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                                    </div>
                                    <div class="c33-download-overlay">
                                        <p>Add to scene</p>
                                    </div>
                                </div>

                                <!-- Demo Object 2: Laptop -->
                                <div class="demo-grid-item c33-download"
                                    data-asset-name="laptop" 
                                    data-download-type="model">
                                    <img src="<?php echo esc_url($pluginUrl . '/assets/img/laptop.jpg'); ?>" alt="Demo Laptop">
                                    
                                    <div class='c3_button_with_text'>
                                        <h4>Laptop</h4>
                                        <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                                    </div>
                                    <div class="c33-download-overlay">
                                        <p>Add to scene</p>
                                    </div>
                                </div>

                                <!-- Demo Object 3: Star -->
                                <div class="demo-grid-item c33-download"
                                    data-asset-name="star" 
                                    data-download-type="model">
                                    <img src="<?php echo esc_url($pluginUrl . '/assets/img/star.jpg'); ?>" alt="Demo Star">
                                    <div class='c3_button_with_text'>
                                        <h4>Star</h4>
                                        <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                                    </div>
                                    <div class="c33-download-overlay">
                                        <p>Add to scene</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                                                <!-- Open/Upload Model Section -->
                        <section id="upload-existing">
                            <h3>Upload/Existing</h3>
                                <button type="button" class="c33d_media_library">
                                    Media Library
                                </button>
                        </section>
                <!-- </div> -->
            </div>

            <!-- Right Side: Import Demo Scene Grid -->
            <div class="right-side">
                <h2>Import Demo Scene</h2>
                <div class="demo-grid">
                    <!-- Demo Object 1: Phone -->
                    <div class="demo-grid-item c33-download"
                        data-asset-name="devices-stars" 
                        data-download-type="scene">
                        <img src="<?php echo esc_url($pluginUrl . '/assets/img/devices-stars.jpg'); ?>" alt="Demo Phone">
                        
                        <div class='c3_button_with_text'>
                            <h4>Devices & Stars</h4>
                            <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                        </div>
                        <div class="c33-download-overlay">
                            <p>Add to scene</p>
                        </div>
                    </div>

                    <!-- Demo Object 2: Laptop -->
                    <div class="demo-grid-item c33-download"
                        data-asset-name="phone-star-scroll" 
                        data-download-type="scene">
                        <img src="<?php echo esc_url($pluginUrl . '/assets/img/scroll-phone.jpg'); ?>" alt="Demo Laptop">
                        
                        <div class='c3_button_with_text'>
                            <h4>Scrolling Phones</h4>
                            <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                        </div>
                        <div class="c33-download-overlay">
                            <p>Add to scene</p>
                        </div>
                    </div>

                    <!-- Demo Object 3: Star -->
                    <div class="demo-grid-item c33-download"
                        data-asset-name="phone-carousel" 
                        data-download-type="scene">
                        <img src="<?php echo esc_url($pluginUrl . '/assets/img/phone-carousel.jpg'); ?>" alt="Demo Star">
                        <div class='c3_button_with_text'>
                            <h4>Phone Carousel</h4>
                            <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                        </div>
                        <div class="c33-download-overlay">
                            <p>Add to scene</p>
                        </div>
                    </div>

                    <div class="demo-grid-item c33-download"
                        data-asset-name="isometric-devices" 
                        data-download-type="scene">
                        <img src="<?php echo esc_url($pluginUrl . '/assets/img/iso-devices.jpg'); ?>" alt="Demo Star">
                        <div class='c3_button_with_text'>
                            <h4>Isometric Devices</h4>
                            <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                        </div>
                        <div class="c33-download-overlay">
                            <p>Add to scene</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div style="display: flex;
            justify-content: center;
            padding: 10px;
            gap: 10px;
            position: absolute;
            top: 0;
            z-index: 1;
            left: 50%;
            transform: translate(-50%);">
        <button id="toggleControls" type="button">Toggle Controls</button>
        <button id="mobileMode" type="button"><span class="dashicons dashicons-smartphone"></span>Mobile View</button>

        </div>
        <div id = "canvasAndControls">
            <div id="threejs-canvas" style="width: 100%; height: var(--c33d-canvas-height);"></div>
            <!-- <div id="codes_controls"> -->
                <div class='topTransforms'>

                    <button class='transModeButton' id="btnTranslateMode" type="button" onmousedown="setTransformMode('translate', event, this)">Translate (T)</button>
                    <button class='transModeButton' id="btnRotateMode" type="button" onmousedown="setTransformMode('rotate', event,  this)">Rotate (R)</button>
                    <button class='transModeButton' id='codesScaleButton' title="not available in loop mode, use scale text input on left" type="button" onmousedown="setTransformMode('scale', event, this)">Scale (Y)</button>
                    <button id="toggleGizmo" type="button" class="transButtonActive">Gizmo</button>
                </div>

            



          <div class='leftControls'>
            <div class='leftContInner'>
                <!-- <label>Add Object</label> -->
            
                <label>3D Models 🧊</label>
                <!-- <div class="transform-group"> -->
                    <button style="" type="button" class="button c33d_media_library" >Upload/Library <span class="dashicons dashicons-admin-media"></span></button>
                    <button style="" type="button" class="button" id="add_model_button" >Demos <span class="dashicons dashicons-download"></span></button>
                <!-- </div> -->
                <label>Others</label>
                <div class="transform-group">
                    <button style="" type="button" class="button" id="add_image_button" >Image <span class="dashicons dashicons-format-image"></span></button>
                    <button style="" type="button" class="button" id="add_group_button" >Group <span class="dashicons dashicons-open-folder"></span></button>
                </div>
                <!-- <div style="position: absolute; top: 10px; right: 10px; z-index: 100;"> -->
                    <select id="light-selector" style="padding: 5px; border-radius: 5px; font-family: sans-serif;">
                        <option value="">Add Light</option>
                        <option value="lightA">Ambient</option>
                        <option value="lightD">Directional</option>
                        <option value="lightP">Point</option>
                        <option value="lightS">Spot</option>
                    </select>
                <!-- </div> -->
                <hr>
                <!-- <h2> Scene Objects</h2> -->
                <div id="objectListContainer" style="">   
                    <ul id="sceneObjectList" style="list-style: none; padding: 0; margin: 0;">
                    </ul>
                </div>

                                <hr>

                <div class="transform-group">
                    <button style="width: 50%;" type="button" class="button" id="delete_model_button">Delete</button>
                    <button style="width: 50%;" type="button" class="button" id="btn_duplicate">Clone</button>
                </div>
            </div>


                
            <div class='leftBottom'>
                <button id='c3SaveButton' style="width:100%; background-color: var(--c33d-yellow); color: var(--c33d-bg-dark-blue);" type="button" class="button" > Save </button>
                <p>Use this shortcode to display the scene on your site:</p>
                <textarea id='shortcodeArea' readonly style="width: 100%;"><?php echo esc_html($shortcode); ?></textarea>
            </div>





          </div>
          <!-- end left controls -->


          <div class='rightControls'>



            <div class="tabContainer">
                <div id="objectTab" class="tab activeTab" >Obj</div>
                <div id="animationTab" class="tab">Anim</div>
                <div id="lightsTab" class="tab">💡🎥</div>
                <div id="settingsTab" class="tab">⚙️</div>
                <!-- <div id='' class="tab" onmousedown="tabClicked('export')">&infin</div> -->
            </div>
            <div class='tabContent cobject'>
                <fieldset>
                    <label>Position</label>
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
                </fieldset>

                <fieldset>
                    <label>Rotation</label>
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
                </fieldset>

                <fieldset>
                    <label>
                        Scale (model)
                    </label>
                    <div class="transform-group">
                    <div class="transform-field">
                        <label for="threejs_rotation_x">X</label>
                        <input type="number" name="scale" class="" id="codes_scale_x" value="<?php echo esc_attr($scale_x); ?>" step="0.01" />
                    </div>
                    <div class="transform-field">
                        <label for="threejs_rotation_y">Y</label>
                        <input type="number" name="scale" class="" id="codes_scale_y" value="<?php echo esc_attr($scale_y); ?>" step="0.01" />
                    </div>
                    <div class="transform-field">
                        <label for="threejs_rotation_z">Z</label>
                        <input type="number" name="scale" class="" id="codes_scale_z" value="<?php echo esc_attr($scale_z); ?>" step="0.01" />
                    </div>
                    </div>
                </fieldset>
                
                <hr>
                <div style="">
                    <label for="parentSelector">Move to group:</label>
                    <select id="parentSelector" style="width: 100%; padding: 5px;"></select>
                <label>Current group: <span id='current-group-label'></span></label>
                </div>

                <div style="">
                    <label for="parentSelector">On Click Link</label>
                    <input type="text" id="link_input" placeholder="Add Link"/>
                </div>

                <hr>

                <label>Materials</label>

                <select id="materialSelector" class="select-input">
                    <!-- Options will be populated by JavaScript -->
                </select>

                <!-- Material Properties Panel (Initially hidden) -->
                <div id="materialPropertiesPanel" class="properties-panel hidden">
                    <!-- Material Color Control -->



                    <label for="materialColor" class="property-label">Base</label>
                    <div class="transform-group">
                        <input type="color" id="materialColor" class="color-picker">
                    <!-- </div> -->

                    <!-- Material Texture Button -->
                    <!-- <div class="texture-button-container"> -->
                        <button type="button" id="materialTextureBtn" class="texture-button">
                            Texture
                        </button>
                        <button type="button" id="deleteTexture" class="texture-button">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>

                    <!-- Emissive Color Control -->
                    <label for="emissiveColor" class="property-label">Emissive</label>
                    <div class="transform-group">
                        <input type="color" id="emissiveColor" class="color-picker">
                    <!-- </div> -->

                        <button type="button" id="emissiveTextureBtn" class="texture-button">
                            Texture
                        </button>

                        <button type="button" id="deleteEmissive" class="texture-button">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>

                    <div class="transform-group">
                        <label for="blendMode" class="property-label">Blending</label>
                        <select id="blendMode">
                            <option value="NormalBlending">Normal</option>
                            <option value="AdditiveBlending">Additive</option>
                            <option value="SubtractiveBlending">Subtractive</option>
                            <option value="MultiplyBlending">Multiply</option>
                            <option value="NoBlending">None</option>
                            <!-- <option value="CustomBlending">Custom Blending</option> -->
                        </select>

                    </div>

                    <div class="transform-group">
                        <label for="stencil-send">Stencil Send</label>
                        <input id="stencil-send" type="number">
                    </div>
                    <div class="transform-group">
                        <label for="stencil-receive">Stencil Recieve</label>
                        <input id="stencil-receive" type="number">
                    </div>
                    <div class="transform-group">
                        <label for="stencil-receive">Equal Stencil</label>
                        <input type="checkbox" id="stencilShowHide" checked class="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 transition duration-150 ease-in-out">
                    </div>
                </div>
            </div>
            
            <div class='tabContent csettings'>
                <label>Breakpoint (px) </label>
                <input id="breakPoint" class="" type="number" value="<?php echo esc_attr($breakpoint); ?>">

                <div class="transform-group" style="">

                    <p>Background</p>
                    <input type="color" id="backgroundColor" class="color-picker">
                </div>

            </div>

            <div class='tabContent canimation'>
                <!-- Mouse Animation Link -->
                    <div class="checkbox-group">
                    <input type="checkbox" name="mouseAnimationLink" id="mouseAnimationLink" <?php checked($mouse_enabled, 'on'); ?>>
                    <label for="mouseAnimationLink">Enable Mouse Animation</label>
                    </div>
                    <!-- Mouse Rotation Strength -->
                    <fieldset>
                        <legend>Scene Rotation Degrees</legend>
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
                        <legend>Scroll Scene Movement</legend>
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
                </div>

            
            <div class='tabContent clights'>
                <label for="ambient-light-slider">Ambient Intensity:</label>
                <div class="rangeWithValue">
                    <input type="range" name="ambient_light_intensity" id="ambient_light_intensity" max="3" step="0.05" value="<?php echo esc_attr($light_intensity); ?>" />
                    <span id="light_intensity_value"><?php echo esc_attr($light_intensity); ?></span>
                </div>
                <!-- Directional Light Intensity -->
                <label>Directional Intensity: </label>
                <div class="rangeWithValue">
                    <input type="range" name="directionalLightIntensity" id="directionalLightIntensity" max="3" step="0.05" value="<?php echo esc_attr($directional_light_intensity); ?>">
                    <span id="directional_intensity_value"><?php echo esc_attr($directional_light_intensity); ?></span>
                </div>
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
                <div class="transform-group">
                    <label>Colour</label>
                    <input type="color" id="lightColor" class="color-picker">
                </div>

                <!-- <label>
                    <input type="checkbox" name="useEnvLight" id="useEnvLight" <?php checked($use_env_light, 'on'); ?>>
                    Use Environment Light (HDR)
                </label> -->
            <hr>

            <!-- Toggle for isOrthoCamera -->
            <label>
                <input type="checkbox" name="isOrthoCamera" id="isOrthoCamera" <?php checked($is_ortho_camera, 'on'); ?>>
                Use Orthographic Camera
            </label>

            <hr>

            <button type="button" id="orbitToggle">Toggle Camera Control</button>

            </div>
                <!-- <hr> -->
            <!-- Toggle for Activating Loop -->
             <div id="loopComingSoon" style="display:none">
                    <label>
                    <input type="checkbox" name="loopActive" id="loopActive" <?php checked($loop_active, true); ?>>
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
          
        </div>

          <input type="hidden" id="threejs_model_url" name="threejs_model_url" value="<?php echo esc_url($model_url); ?>" />
          <button type="button" class="button" id="threejs_model_url_button" style="display:none">Change Model</button>
          <p id="threejs_model_url_preview">
              <?php if ($model_url): ?>
                  Current Model: <a href="<?php echo esc_url($model_url); ?>" target="_blank"><?php echo esc_url($model_url); ?></a>
              <?php endif; ?>
          </p>

        <div id="modelImportModal" class="modal-overlay hidden-modal">
            <div class="modal-content">
                <!-- Close Button -->
                <button id="closeModalBtn" type="button" aria-label="Close modal">
                    &times;
                </button>

                <!-- Demo Objects Section -->
                    <!-- <h2>Download Demo Objects</h2> -->
                    <h2>Demo Objects</h2>
                    <div class="demo-grid demo-three-column">
                        <!-- Demo Object 1: Phone -->
                        <div class="demo-grid-item c33-download"
                            data-asset-name="phone" 
                            data-download-type="model">
                            <img src="<?php echo esc_url($pluginUrl . '/assets/img/phone.jpg'); ?>" alt="Demo Phone">
                            
                            <div class='c3_button_with_text'>
                                <h4>Phone</h4>
                                <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                            </div>
                            <div class="c33-download-overlay">
                                <p>Add to scene</p>
                            </div>
                        </div>

                        <!-- Demo Object 2: Laptop -->
                        <div class="demo-grid-item c33-download"
                            data-asset-name="laptop" 
                            data-download-type="model">
                            <img src="<?php echo esc_url($pluginUrl . '/assets/img/laptop.jpg'); ?>" alt="Demo Laptop">
                            
                            <div class='c3_button_with_text'>
                                <h4>Laptop</h4>
                                <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                            </div>
                            <div class="c33-download-overlay">
                                <p>Add to scene</p>
                            </div>
                        </div>

                        <!-- Demo Object 3: Star -->
                        <div class="demo-grid-item c33-download"
                            data-asset-name="star" 
                            data-download-type="model">
                            <img src="<?php echo esc_url($pluginUrl . '/assets/img/star.jpg'); ?>" alt="Demo Star">
                            <div class='c3_button_with_text'>
                                <h4>Star</h4>
                                <span class="dashicons dashicons-image-rotate c3-loading-icon"></span>
                            </div>
                            <div class="c33-download-overlay">
                                <p>Add to scene</p>
                            </div>
                        </div>
                    </div>
            </div>
        </div>

    </div>
    <?php
}
