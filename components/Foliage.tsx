import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { SETTINGS, COLORS } from '../constants';
import { foliageVertexShader, foliageFragmentShader, getRandomSpherePoint, getConePoint } from '../utils/math';

const Foliage: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  const targetProgress = useAppStore((state) => state.targetProgress);
  const currentProgress = useRef(0);
  
  const { positions, chaosPositions, targetPositions, randoms } = useMemo(() => {
    const count = SETTINGS.PARTICLE_COUNT;
    const chaosPos = new Float32Array(count * 3);
    const targetPos = new Float32Array(count * 3);
    const randomsArray = new Float32Array(count);
    // Initial positions buffer (will be overridden by shader but needed for init)
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Target: Cone shape
      const [tx, ty, tz] = getConePoint(SETTINGS.TREE_HEIGHT, SETTINGS.TREE_RADIUS, Math.random());
      targetPos[i * 3] = tx;
      targetPos[i * 3 + 1] = ty;
      targetPos[i * 3 + 2] = tz;

      // Chaos: Sphere shape
      const [cx, cy, cz] = getRandomSpherePoint(SETTINGS.CHAOS_RADIUS);
      chaosPos[i * 3] = cx;
      chaosPos[i * 3 + 1] = cy;
      chaosPos[i * 3 + 2] = cz;

      randomsArray[i] = Math.random();
    }
    
    return { positions: pos, chaosPositions: chaosPos, targetPositions: targetPos, randoms: randomsArray };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uColor: { value: new THREE.Color(COLORS.EMERALD) },
    uSparkleColor: { value: new THREE.Color(COLORS.GOLD) }
  }), []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Lerp the progress for smooth transition logic
      currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, targetProgress, delta * 0.8);
      
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = currentProgress.current;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={chaosPositions.length / 3}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={targetPositions.length / 3}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={foliageVertexShader}
        fragmentShader={foliageFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default Foliage;
