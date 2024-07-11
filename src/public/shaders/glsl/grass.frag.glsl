uniform sampler2D texture1;
uniform sampler2D textures[4];

varying vec2 vUv;
varying vec3 vColor;

void main() {
  float contrast = 1.1;
  float brightness = 0.05;
  vec3 color = texture2D(textures[0], vUv).rgb * contrast;
  color = color + vec3(brightness, brightness, brightness);
  gl_FragColor.rgb = color;
  gl_FragColor.a = 1.;
}