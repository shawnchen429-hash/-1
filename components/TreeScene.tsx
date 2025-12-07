import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../store';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import Polaroids from './Polaroids';
import { COLORS } from '../constants';

const CameraController: React.FC = () => {
  const handPosition = useAppStore((state) => state.handPosition);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const vec = new THREE.Vector3();

  useFrame((state) => {
    // Smoothly interpolate camera position based on hand input or default orbit
    const targetX = handPosition.x * 10;
    const targetY = 4 + handPosition.y * 5;
    
    // Base position
    const baseX = state.camera.position.x;
    const baseY = state.camera.position.y;
    
    // We modify the lookAt slightly or orbit
    if (cameraRef.current) {
        // Very subtle parallax effect
        state.camera.position.x = THREE.MathUtils.lerp(baseX, targetX, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(baseY, targetY, 0.05);
        state.camera.lookAt(0, 4, 0);
    }
  });

  return null;
};

const TreeScene: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#050a05]">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 4, 25]} fov={50} />
        
        {/* Cinematic Lighting */}
        <ambientLight intensity={0.2} color={COLORS.EMERALD} />
        <spotLight 
          position={[10, 20, 10]} 
          angle={0.5} 
          penumbra={1} 
          intensity={200} 
          color={COLORS.GOLD} 
          castShadow 
          shadow-bias={-0.0001}
        />
        <pointLight position={[-10, 5, -10]} intensity={50} color={COLORS.RED} />
        <pointLight position={[0, -5, 10]} intensity={50} color={COLORS.EMERALD} />

        {/* Environment */}
        <Environment preset="lobby" background={false} blur={0.8} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Content */}
        <group position={[0, -4, 0]}>
          <Suspense fallback={null}>
             <Foliage />
             <Ornaments />
             <Polaroids />
          </Suspense>
        </group>

        {/* Ground Reflection */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial 
            color="#001a0d" 
            metalness={0.8} 
            roughness={0.2} 
          />
        </mesh>

        {/* Effects */}
        <EffectComposer disableNormalPass>
          <Bloom 
            luminanceThreshold={0.8} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.6}
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={0.02} />
        </EffectComposer>

        <CameraController />
        <OrbitControls 
           enablePan={false} 
           enableZoom={true} 
           minDistance={10} 
           maxDistance={40} 
           maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

export default TreeScene;
