import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AgentType } from '../types/database';

interface JarvisCoreProps {
  activeAgent: AgentType | 'idle'; 
  status: 'idle' | 'speaking';
}

export default function JarvisCore({ status }: JarvisCoreProps) {
  const meshRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });

  // Handle click/touch interactions
  const handleInteraction = (e: THREE.Event) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pointerEvent = e as any;
    const clientX = pointerEvent.clientX || 0;
    const clientY = pointerEvent.clientY || 0;
    
    // Normalize to -1 to 1
    const x = (clientX / window.innerWidth) * 2 - 1;
    const y = -(clientY / window.innerHeight) * 2 + 1;
    
    // Set velocity for rotation
    velocityRef.current = { x: y * 0.1, y: x * 0.1 };
  };

  // 2. The Animation Loop
  useFrame(({ clock }) => {
    if (!meshRef.current || !lightRef.current) return;
    const t = clock.getElapsedTime();

    // --- A. Slow Rotation ---
    // Base slow rotation
    const baseRotationSpeed = 0.003;
    rotationRef.current.y += baseRotationSpeed + velocityRef.current.y;
    rotationRef.current.x += velocityRef.current.x;
    
    // Apply damping to velocity
    velocityRef.current.x *= 0.95;
    velocityRef.current.y *= 0.95;
    
    meshRef.current.rotation.y = rotationRef.current.y;
    meshRef.current.rotation.x = rotationRef.current.x;
    meshRef.current.rotation.z = Math.sin(t * 0.2) * 0.03;

    // --- B. Dynamic Pulse (only when speaking) ---
    let scale = 1.0;
    if (status === 'speaking') {
      const pulseSpeed = 3;
      const pulseSize = 0.15;
      scale = 1.0 + Math.sin(t * pulseSpeed) * pulseSize;
    }
    
    // Smoothly LERP to the new scale
    const currentScale = meshRef.current.scale.x;
    const smoothScale = THREE.MathUtils.lerp(currentScale, scale, 0.1);
    meshRef.current.scale.set(smoothScale, smoothScale, smoothScale);

    // --- C. Brightness/Glow ---
    // Brighten up when speaking
    const targetIntensity = status === 'speaking' ? 4 : 1.5;
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.1);
  });

  return (
    <group 
      position={[0, 0, 0]}
      onPointerDown={handleInteraction}
    >
      {/* THE DATA CLOUD */}
      <points ref={meshRef}>
        {/* High detail sphere (radius 1.5, 64 segments) */}
        <sphereGeometry args={[1.5, 64, 64]} />
        <pointsMaterial
          color="#000000" // Black
          size={0.03}     // Particle size
          transparent={true}
          opacity={0.85}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Internal Glow Light */}
      <pointLight 
        ref={lightRef} 
        distance={12}
        decay={1.5}
        color="#000000"
        intensity={1.5}
      />
    </group>
  );
}