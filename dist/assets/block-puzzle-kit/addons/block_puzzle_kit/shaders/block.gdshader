shader_type canvas_item;
// A block: a band of light swept across it, a white flash, a lift for blocks about to clear, and
// grey for a lost board. Works on any sprite.

// where the band of light is, from top left (0) to bottom right (1); outside 0..1 it's off
uniform float shine = -1.0;
uniform float shine_strength : hint_range(0.0, 2.0) = 0.6;
uniform float flash : hint_range(0.0, 1.0) = 0.0;
uniform float lift : hint_range(0.0, 1.0) = 0.0;
uniform float grey : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	float band = smoothstep(0.1, 0.0, abs((UV.x + UV.y) * 0.5 - shine));
	c.rgb += band * shine_strength * c.a;
	c.rgb = mix(c.rgb, c.rgb * 0.6 + vec3(0.45), lift);
	c.rgb = mix(c.rgb, vec3(dot(c.rgb, vec3(0.3, 0.55, 0.15))) * 0.7, grey);
	c.rgb = mix(c.rgb, vec3(1.0), flash);
	COLOR = c * COLOR;
}
