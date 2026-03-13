<?php
/**
 * Elementor Widget for C33D Scene
 * Path: /wp-content/plugins/your-plugin/widgets/scene-widget.php
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Elementor_C33D_Scene_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'c33d_scene_widget'; }
	public function get_title() { return esc_html__( 'C33D Scene', 'text-domain' ); }
	public function get_icon() { return 'eicon-eye'; }
	public function get_categories() { return [ 'general' ]; }

	protected function register_controls() {

		$this->start_controls_section(
			'content_section',
			[
				'label' => esc_html__( 'Content', 'text-domain' ),
				'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'scene_id',
			[
				'label'       => esc_html__( 'Select Scene', 'text-domain' ),
				'type'        => \Elementor\Controls_Manager::SELECT2,
				'label_block' => true,
				'options'     => $this->get_scene_posts(),
				'default'     => '',
			]
		);

		$this->add_responsive_control(
			'scene_width',
			[
				'label'      => esc_html__( 'Width', 'text-domain' ),
				'type'       => \Elementor\Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vw' ],
				'range'      => [
					'px' => [ 'min' => 0, 'max' => 1600 ],
					'%'  => [ 'min' => 0, 'max' => 100 ],
				],
				'default'    => [ 'unit' => '%', 'size' => 100 ],
				// No selectors here = Forces PHP Refresh
			]
		);

		$this->add_responsive_control(
			'scene_height',
			[
				'label'      => esc_html__( 'Height', 'text-domain' ),
				'type'       => \Elementor\Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh' ],
				'range'      => [
					'px' => [ 'min' => 0, 'max' => 1200 ],
					'vh' => [ 'min' => 0, 'max' => 100 ],
				],
				'default'    => [ 'unit' => 'px', 'size' => 800 ],
			]
		);

		$this->end_controls_section();
	}

	protected function get_scene_posts() {
		$posts = get_posts(['post_type' => 'c33d_scene', 'posts_per_page' => -1]);
		$options = [ '' => esc_html__( 'Select a Scene', 'text-domain' ) ];
		if ( ! empty( $posts ) ) {
			foreach ( $posts as $post ) {
				$options[ $post->ID ] = $post->post_title;
			}
		}
		return $options;
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$node_id  = $this->get_id();

		if ( empty( $settings['scene_id'] ) ) {
			echo '<div class="elementor-panel-alert elementor-panel-alert-info">Please select a scene.</div>';
			return;
		}

		// Helper function to safely extract responsive sizes
		$get_size = function($key) use ($settings) {
			if ( isset($settings[$key]) && is_array($settings[$key]) && $settings[$key]['size'] !== '' ) {
				return $settings[$key]['size'] . $settings[$key]['unit'];
			}
			return null;
		};

		// Cascading Widths (Defaults to Desktop -> then Tablet -> then Mobile)
		$w_desk = $get_size('scene_width') ?: '100%';
		$w_tab  = $get_size('scene_width_tablet') ?: $w_desk;
		$w_mob  = $get_size('scene_width_mobile') ?: $w_tab;

		// Cascading Heights (Defaults to Desktop -> then Tablet -> then Mobile)
		$h_desk = $get_size('scene_height') ?: '800px';
		$h_tab  = $get_size('scene_height_tablet') ?: $h_desk;
		$h_mob  = $get_size('scene_height_mobile') ?: $h_tab;

		?>
		<style>
			/* DESKTOP (Base Settings) */
			.elementor-element.elementor-element-<?php echo esc_attr($node_id); ?> {
				width: <?php echo esc_attr($w_desk); ?> !important;
				max-width: 100%;
				margin-left: auto !important;
				margin-right: auto !important;
			}
			.elementor-element-<?php echo esc_attr($node_id); ?> .elementor-widget-container {
				width: 100% !important;
			}
			.c33d-widget-wrapper-<?php echo esc_attr($node_id); ?> {
				height: <?php echo esc_attr($h_desk); ?>;
				width: 100%;
				overflow: hidden;
			}

			/* TABLET */
			@media (max-width: 1024px) {
				.elementor-element.elementor-element-<?php echo esc_attr($node_id); ?> {
					width: <?php echo esc_attr($w_tab); ?> !important;
				}
				.c33d-widget-wrapper-<?php echo esc_attr($node_id); ?> {
					height: <?php echo esc_attr($h_tab); ?>;
				}
			}

			/* MOBILE */
			@media (max-width: 767px) {
				.elementor-element.elementor-element-<?php echo esc_attr($node_id); ?> {
					width: <?php echo esc_attr($w_mob); ?> !important;
				}
				.c33d-widget-wrapper-<?php echo esc_attr($node_id); ?> {
					height: <?php echo esc_attr($h_mob); ?>;
				}
			}
		</style>
		<?php

		echo '<div class="c33d-widget-wrapper-' . esc_attr($node_id) . '">';
			/**
			 * PRO TIP: We pass "100%" to the shortcode's height attribute here!
			 * Why? Because our CSS wrapper now perfectly handles the responsive height.
			 * If we passed "800px" to the shortcode, it might spill out of the wrapper on Mobile.
			 */
			echo do_shortcode( sprintf( 
				'[c33d_scene id="%s" height="100%%"]', 
				esc_attr( $settings['scene_id'] )
			) );
		echo '</div>';

		// Re-trigger 3D resize in editor
		if ( \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
			?>
			<script>
				(function($) {
					clearTimeout(window.c33dTimer);
					window.c33dTimer = setTimeout(function() {
						$(window).trigger('resize');
					}, 200);
				})(jQuery);
			</script>
			<?php
		}
	}
}