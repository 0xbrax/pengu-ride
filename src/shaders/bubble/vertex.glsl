precision lowp float;

attribute vec2 aPosition;
attribute float aSize;
attribute float aSpeed;
attribute float aOffset;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;

uniform float uPixelRatio;
uniform float uDeltaTime;
uniform float uScale;
uniform float uMaxX;
uniform float uMaxY;

varying float vPositionY;

float remap(float value, float originMin, float originMax, float destinationMin, float destinationMax) {
    return destinationMin + (value - originMin) * (destinationMax - destinationMin) / (originMax - originMin);
}



void main() {
    vec2 newPosition = aPosition;

    // animation
    newPosition.y = newPosition.y - (uDeltaTime * 1.5 * aSpeed);
    newPosition.x = newPosition.x + (uDeltaTime * 0.75 * aOffset);

    // infinite loop
    newPosition.y = mod(newPosition.y, uMaxY);
    newPosition.x = mod(newPosition.x, uMaxX);

    // final position
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(newPosition, 1.0)).xy, 0.0, 1.0);
    gl_PointSize = 30.0 * uPixelRatio * uScale * aSize;

    // data from vertex to fragment
    vPositionY = remap(newPosition.y, 0.0, uMaxY, 0.0, 0.5);
}