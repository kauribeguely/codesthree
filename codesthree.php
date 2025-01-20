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

// Enqueue scripts and styles
function threejs_editor_enqueue_scripts( $hook ) {
    if ( $hook !== 'toplevel_page_threejs-model-editor' ) {
        return;
    }
    wp_enqueue_script( 'threejs', 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.min.js', array(), null, true );
    wp_enqueue_script( 'threejs-editor', plugins_url( 'admin.js', __FILE__ ), array( 'threejs' ), null, true );
    wp_enqueue_style( 'threejs-editor-style', plugins_url( 'styles.css', __FILE__ ) );
}
add_action( 'admin_enqueue_scripts', 'threejs_editor_enqueue_scripts' );

// Add menu item
function threejs_editor_menu() {
    add_menu_page(
        '3D Element Editor',
        'Codes 3D',
        'manage_options',
        'threejs-model-editor',
        'threejs_editor_page',
        'dashicons-admin-site-alt2',
        100
    );
}
add_action( 'admin_menu', 'threejs_editor_menu' );

// Admin page content
function threejs_editor_page() {
    ?>
    <div id="threejs-editor-container">
        <h1>3D Model Editor</h1>
        <div id="threejs-canvas" style="width: 100%; height: 500px;"></div>
        <button id="save-model-data">Save Changes</button>
    </div>
    <?php
}
