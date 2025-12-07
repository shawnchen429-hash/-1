import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { SETTINGS, COLORS } from '../constants';
import { getRandomSpherePoint, getConePoint } from '../utils/math';
import { OrnamentData } from '../types';

const tempObject = new THREE.Object3D();
const tempVec3 = new THREE.Vector3();

const Ornaments: React.FC = () => {
  const targetProgress = useAppStore((state) => state.targetProgress);
  
  // Create static data for ornaments
  const ornaments = useMemo(() => {
    const items: OrnamentData[] = [];
    const colors = [COLORS.GOLD, COLORS.METALLIC_GOLD, COLORS.RED, COLORS.SILVER];
    
    for (let i = 0; i < SETTINGS.ORNAMENT_COUNT; i++) {
      const isBox = Math.random() > 0.7;
      const weight = isBox ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4;
      const scale = isBox ? 0.4 + Math.random() * 0.3 : 0.25 + Math.random() * 0.2;
      
      const chaos = getRandomSpherePoint(SETTINGS.CHAOS_RADIUS);
      // Ensure ornaments are slightly inside foliage so they nestle
      const target = getConePoint(SETTINGS.TREE_HEIGHT, SETTINGS.TREE_RADIUS * 0.9, Math.random() * 0.8 + 0.1);

      items.push({
        id: i,
        chaosPos: chaos,
        targetPos: target,
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: isBox ? 'box' : 'ball',
        weight
      });
    }
    return items;
  }, []);

  const ballMesh = useRef<THREE.InstancedMesh>(null);
  const boxMesh = useRef<THREE.InstancedMesh>(null);

  // Separate data for rendering
  const balls = useMemo(() => ornaments.filter(o => o.type === 'ball'), [ornaments]);
  const boxes = useMemo(() => ornaments.filter(o => o.type === 'box'), [ornaments]);

  useLayoutEffect(() => {
    // Set initial colors
    if (ballMesh.current) {
      balls.forEach((ball, i) => {
        tempObject.position.set(...ball.chaosPos);
        tempObject.updateMatrix();
        ballMesh.current!.setColorAt(i, new THREE.Color(ball.color));
      });
      ballMesh.current.instanceColor!.needsUpdate = true;
    }
    if (boxMesh.current) {
      boxes.forEach((box, i) => {
        tempObject.position.set(...box.chaosPos);
        tempObject.updateMatrix();
        boxMesh.current!.setColorAt(i, new THREE.Color(box.color));
      });
      boxMesh.current.instanceColor!.needsUpdate = true;
    }
  }, [balls, boxes]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    
    const updateMesh = (mesh: THREE.InstancedMesh | null, data: OrnamentData[]) => {
      if (!mesh) return;
      
      data.forEach((item, i) => {
        // Individual progress based on weight (heavy items move slower/different)
        // We use the global targetProgress but modulate the interpolation speed
        
        // Calculate current position based on accumulated interpolation in real physics engine
        // simpler here: we interpolate strictly between chaos and target based on global progress
        
        // Add a "lag" factor based on weight
        const lag = item.weight * 0.5;
        const effectiveProgress = THREE.MathUtils.clamp(
          (targetProgress - lag) / (1 - lag * 0.5), 
          0, 
          1
        );
        
        // Easing
        const ease = effectiveProgress < 0.5 
          ? 4 * effectiveProgress * effectiveProgress * effectiveProgress 
          : 1 - Math.pow(-2 * effectiveProgress + 2, 3) / 2;

        const cx = item.chaosPos[0];
        const cy = item.chaosPos[1];
        const cz = item.chaosPos[2];
        
        const tx = item.targetPos[0];
        const ty = item.targetPos[1];
        const tz = item.targetPos[2];

        // Current Pos
        tempObject.position.set(
          THREE.MathUtils.lerp(cx, tx, ease),
          THREE.MathUtils.lerp(cy, ty, ease),
          THREE.MathUtils.lerp(cz, tz, ease)
        );

        // Add some floating noise when in Chaos mode
        if (effectiveProgress < 0.9) {
          tempObject.position.y += Math.sin(t + item.id) * 0.02;
          tempObject.rotation.x = item.rotation[0] + t * 0.5 * (1 - effectiveProgress);
          tempObject.rotation.y = item.rotation[1] + t * 0.3 * (1 - effectiveProgress);
        } else {
           // Stabilize rotation
           tempObject.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
        }

        tempObject.scale.setScalar(item.scale);
        tempObject.updateMatrix();
        mesh.setMatrixAt(i, tempObject.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    updateMesh(ballMesh.current, balls);
    updateMesh(boxMesh.current, boxes);
  });

  return (
    <group>
      <instancedMesh ref={ballMesh} args={[undefined, undefined, balls.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          metalness={1} 
          roughness={0.15} 
          envMapIntensity={1.5}
        />
      </instancedMesh>
      
      <instancedMesh ref={boxMesh} args={[undefined, undefined, boxes.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          metalness={0.6} 
          roughness={0.2} 
          envMapIntensity={1.2}
        />
      </instancedMesh>
    </group>
  );
};

export default Ornaments;
