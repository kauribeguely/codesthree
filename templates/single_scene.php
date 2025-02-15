<?php
/* Template for displaying custom scenes */
get_header();
?>
<div class="custom-scene-container">
    <?php

    if (have_posts()) :
        while (have_posts()) : the_post();

            $post_id = get_the_ID();
            // echo "<p>Post ID: $post_id</p>"; // Debugging: See if it prints correctly

            $shortcode = '[codes_scene id="' . $post_id . '"]';
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
