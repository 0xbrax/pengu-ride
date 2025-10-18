precision lowp float;

uniform sampler2D uTexture;
uniform float uMaxY;
uniform float uMinY;

varying float vPositionY;



void main() {
    vec4 color = texture2D(uTexture, gl_PointCoord);

    // transparency
    color *= vPositionY;

    // final color
    gl_FragColor = color;
}