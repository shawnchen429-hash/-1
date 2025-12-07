import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { SETTINGS, IMAGES } from '../constants';
import { getRandomSpherePoint, getConePoint } from '../utils/math';
import { PolaroidData } from '../types';

// Individual Polaroid Component
const Polaroid: React.FC<{ data: PolaroidData; texture: THREE.Texture }> = ({ data, texture }) => {
  const meshRef = useRef<THREE.Group>(null);
  const targetProgress = useAppStore((state) => state.targetProgress);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Smoother, floatier lerp for paper
      const ease = targetProgress < 0.5 
          ? 2 * targetProgress * targetProgress 
          : 1 - Math.pow(-2 * targetProgress + 2, 2) / 2;
          
      const cx = data.chaosPos[0];
      const cy = data.chaosPos[1];
      const cz = data.chaosPos[2];
      
      const tx = data.targetPos[0];
      const ty = data.targetPos[1];
      const tz = data.targetPos[2];

      meshRef.current.position.set(
        THREE.MathUtils.lerp(cx, tx, ease),
        THREE.MathUtils.lerp(cy, ty, ease),
        THREE.MathUtils.lerp(cz, tz, ease)
      );
      
      // Look at camera or spiral out
      const time = state.clock.elapsedTime;
      
      if (ease < 0.8) {
        // Tumbling in chaos
        meshRef.current.rotation.x = data.rotation[0] + time * 0.2;
        meshRef.current.rotation.y = data.rotation[1] + time * 0.1;
      } else {
        // Face outward on tree
        meshRef.current.lookAt(0, meshRef.current.position.y, 0);
        meshRef.current.rotateY(Math.PI); // Flip to face out
        // Gentle sway
        meshRef.current.rotation.z = Math.sin(time + data.id) * 0.1;
      }
    }
  });

  return (
    <group ref={meshRef} scale={0.8}>
       {/* White Frame */}
       <mesh position={[0, 0, -0.01]}>
         <boxGeometry args={[1.2, 1.5, 0.02]} />
         <meshStandardMaterial color="#fffff0" roughness={0.9} />
       </mesh>
       {/* Photo */}
       <mesh position={[0, 0.1, 0]}>
         <planeGeometry args={[1, 1]} />
         <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
       </mesh>
    </group>
  );
};

const Polaroids: React.FC = () => {
  // Preload textures
  const textures = useLoader(THREE.TextureLoader, IMAGES);
  
  const polaroids = useMemo(() => {
    const items: PolaroidData[] = [];
    for (let i = 0; i < SETTINGS.POLAROID_COUNT; i++) {
      // Use spiral arrangement for target
      const yRatio = Math.random() * 0.8 + 0.1;
      
      items.push({
        id: i,
        url: IMAGES[i % IMAGES.length],
        chaosPos: getRandomSpherePoint(SETTINGS.CHAOS_RADIUS * 0.8),
        targetPos: getConePoint(SETTINGS.TREE_HEIGHT, SETTINGS.TREE_RADIUS + 0.5, yRatio),
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0]
      });
    }
    return items;
  }, []);

  return (
    <group>
      {polaroids.map((data, i) => (
        <Polaroid key={i} data={data} texture={textures[i % textures.length]} />
      ))}
    </group>
  );
};

export default Polaroids;
