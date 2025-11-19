<?php
/* Template for displaying custom scenes */
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();
// wp_enqueue_style('codes-styles');
// wp_enqueue_script_module('codes-scene-script');
?>
<div class="preview-scene-container">
    <?php

    if (have_posts()) :
        while (have_posts()) : the_post();

            $post_id = get_the_ID();
            // echo "<p>Post ID: $post_id</p>"; // Debugging: See if it prints correctly

            $shortcode = '[c33d_scene id="' . $post_id . ' height="800px"]';
            echo do_shortcode($shortcode); // Execute shortcode

        endwhile;
    else:
        echo "<p>No post found.</p>";
    endif;

    ?>
</div>
<?php
get_footer();
?>
