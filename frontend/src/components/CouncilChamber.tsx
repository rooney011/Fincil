"use client";
import { Canvas } from "@react-three/fiber";
import { useState, useEffect } from "react";
import JarvisCore from "../components/JarvisCore";
import { AgentType } from "../types/database";

interface CouncilChamberProps {
  activeAgent?: AgentType | 'idle';
}

export default function CouncilChamber({ activeAgent: externalActiveAgent }: CouncilChamberProps) {
  // Use external activeAgent if provided, otherwise use internal state
  const [internalActiveAgent, setInternalActiveAgent] = useState<AgentType | 'idle'>('idle');
  const activeAgent = externalActiveAgent ?? internalActiveAgent;
  
  // Determine status based on activeAgent
  // If activeAgent is an actual agent (miser, visionary, twin), it's speaking
  // If activeAgent is 'idle', it's idle
  const status: 'idle' | 'speaking' = (activeAgent && activeAgent !== 'idle') ? 'speaking' : 'idle';

  // SIMULATION FOR DEMO (only runs if no external activeAgent provided)
  useEffect(() => {
    if (externalActiveAgent !== undefined) return;
    
    const sequence = async () => {
      setInternalActiveAgent('idle');
      await new Promise(r => setTimeout(r, 2000));

      setInternalActiveAgent('miser');
      await new Promise(r => setTimeout(r, 3000));

      setInternalActiveAgent('visionary');
      await new Promise(r => setTimeout(r, 3000));

      setInternalActiveAgent('twin');
      await new Promise(r => setTimeout(r, 3000));

      setInternalActiveAgent('idle');
    };
    sequence();
  }, [externalActiveAgent]);

  return (
    <div className="w-full h-[300px] relative flex items-center justify-center">
      
      {/* THE CANVAS 
         - 'alpha: true' makes the background transparent 
         - No 'bg-black' class on the div
      */}
      <Canvas 
        gl={{ alpha: true, antialias: true }} 
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        className="z-10" // Bring to front
      >
        {/* Ambient light for base visibility */}
        <ambientLight intensity={0.5} />
        
        {/* The Jarvis Core */}
        <JarvisCore activeAgent={activeAgent} status={status} />
        
      </Canvas>

      {/* Optional: Add a subtle glow behind the canvas in CSS if you want */}
      <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full z-0 pointer-events-none" />
      
    </div>
  );
}