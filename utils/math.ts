import * as THREE from 'three';
import { SETTINGS } from '../constants';

export const getRandomSpherePoint = (radius: number): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return [x, y, z];
};

export const getConePoint = (height: number, maxRadius: number, yRatio: number): [number, number, number] => {
  // yRatio is 0 (bottom) to 1 (top)
  const y = (yRatio - 0.5) * height; // Center vertically
  const r = maxRadius * (1 - yRatio);
  const theta = Math.random() * Math.PI * 2;
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  return [x, y, z];
};

// Custom Shader for the Foliage (Needles)
export const foliageVertexShader = `
  uniform float uProgress;
  uniform float uTime;
  
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  
  varying vec2 vUv;
  varying float vRandom;
  
  void main() {
    vUv = uv;
    vRandom = aRandom;
    
    // Cubic ease in-out for smoother transition
    float t = uProgress;
    float ease = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
    
    // Add some noise based on time
    vec3 noise = vec3(
      sin(uTime * 2.0 + aRandom * 10.0) * 0.1,
      cos(uTime * 1.5 + aRandom * 10.0) * 0.1,
      sin(uTime * 1.0 + aRandom * 10.0) * 0.1
    ) * (1.0 - ease); // Noise only in chaos
    
    vec3 pos = mix(aChaosPos, aTargetPos, ease) + noise;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (4.0 * aRandom + 2.0) * (10.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const foliageFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uSparkleColor;
  uniform float uTime;
  
  varying float vRandom;
  
  void main() {
    // Circular particle
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    
    // Sparkle effect
    float sparkle = sin(uTime * 5.0 + vRandom * 100.0);
    vec3 finalColor = mix(uColor, uSparkleColor, step(0.95, sparkle));
    
    // Soft edge
    float alpha = 1.0 - smoothstep(0.4, 0.5, r);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
