import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';

const WaveEffect = () => {
  const waveRef = useRef();
  const wave2Ref = useRef();
  const wave3Ref = useRef();

  const waveGeometry = useMemo(() => {
    return new THREE.RingGeometry(1.0, 5.0, 64);
  }, []);

  const waveMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vDistance;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          float radius = length(pos.xy);
          vDistance = radius;
          
          float wave = sin(radius * 4.0 - time * 2.5) * 0.15;
          pos.z += wave * (1.0 - radius / 5.0);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        varying vec2 vUv;
        varying float vDistance;
        
        void main() {
          float fadeEdge = 1.0 - smoothstep(4.2, 5.0, vDistance);
          float fadeCenter = smoothstep(1.0, 1.8, vDistance);
          
          float ripple = sin(vDistance * 6.0 - time * 3.0) * 0.5 + 0.5;
          float pulse = sin(time * 1.2) * 0.3 + 0.7;
          
          float alpha = fadeEdge * fadeCenter * ripple * pulse * opacity * 0.4;
          
          vec3 color = mix(vec3(0.9, 0.6, 0.2), vec3(1.0, 0.8, 0.4), ripple);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (waveMaterial?.uniforms?.time) {
      waveMaterial.uniforms.time.value = time;
    }
    
    if (waveRef.current) {
      waveRef.current.rotation.z = time * 0.1;
    }
    if (wave2Ref.current) {
      wave2Ref.current.rotation.z = -time * 0.15;
    }
    if (wave3Ref.current) {
      wave3Ref.current.rotation.z = time * 0.08;
    }
  });

  return (
    <group position={[0, 0, -2.5]}>
      <mesh ref={waveRef} geometry={waveGeometry} material={waveMaterial} />
      <mesh ref={wave2Ref} geometry={waveGeometry} material={waveMaterial} 
            position={[0, 0, -0.3]} scale={[0.8, 0.8, 1]} />
      <mesh ref={wave3Ref} geometry={waveGeometry} material={waveMaterial} 
            position={[0, 0, -0.6]} scale={[1.2, 1.2, 1]} />
    </group>
  );
};

const WaveMonk = () => {
  const meshRef = useRef();
  const materialRef = useRef();

  const obj = useLoader(OBJLoader, '/monk.obj');

  const vertexShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vPosition = position;
      vNormal = normal;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vec3 color = vec3(0.85, 0.7, 0.5);
      
      vec3 light = normalize(vec3(1.0, 1.0, 1.0));
      float diff = max(dot(normalize(vNormal), light), 0.0);
      color *= (0.5 + 0.5 * diff);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide
    });
  }, [vertexShader, fragmentShader]);
// jj
  const { normalizedObj, scale } = useMemo(() => {
    if (!obj) return { normalizedObj: null, scale: 1 };

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.8;
    const calculatedScale = targetSize / maxDim;

    const center = box.getCenter(new THREE.Vector3());
    obj.position.set(-center.x, -center.y, -center.z);

    return { normalizedObj: obj, scale: calculatedScale };
  }, [obj]);

  useFrame((state) => {
    if (shaderMaterial && shaderMaterial.uniforms && shaderMaterial.uniforms.time) {
      shaderMaterial.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  useEffect(() => {
    if (normalizedObj && meshRef.current) {
      normalizedObj.traverse((child) => {
        if (child.isMesh) {
          child.material = shaderMaterial;
        }
      });
    }
  }, [normalizedObj, shaderMaterial]);

  if (!normalizedObj) return null;

  return (
    <primitive
      ref={meshRef}
      object={normalizedObj}
      scale={[scale, scale, scale]}
      position={[0, 0, 0]}
    />
  );
};

const App = () => {
  const [mousePos, setMousePos] = React.useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = React.useState(false);
  
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  };
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000'
    }}>
      <div style={{
        flex: '0 0 auto',
        padding: '3rem 2rem 1rem',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div 
          style={{
            position: 'relative',
            cursor: 'default',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div style={{
            background: 'linear-gradient(135deg, #c9a96e, #f4d03f, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
            fontSize: 'clamp(1.125rem, 2.8vw, 1.5rem)',
            fontWeight: '600',
            lineHeight: '1.6',
            letterSpacing: '0.02em',
            clipPath: isHovering ? `circle(80px at ${mousePos.x}% ${mousePos.y}%)` : 'circle(0px at 50% 50%)',
            willChange: 'clip-path'
          }}>
            We're tuning the silence before the scale.<br/>
            Stay close, growth is about to get sorted.
          </div>
        </div>
        
        <div style={{
          background: 'linear-gradient(45deg, #ff6b35, #f7931e, #ffd700, #ff6b35)',
          backgroundSize: '300% 300%',
          animation: 'gradientShift 3s ease-in-out infinite',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: '800',
          lineHeight: '1.1',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          textShadow: '0 0 30px rgba(255, 107, 53, 0.3)',
          filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))'
        }}>
          Entering Monk Mode…
        </div>
      </div>
      
      <div style={{ flex: '1 1 auto', minHeight: '0' }}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <WaveEffect />
          <WaveMonk />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={15}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>
      
      <div style={{
        flex: '0 0 auto',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <p style={{
          color: '#888888',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          fontWeight: '300',
          letterSpacing: '0.05em',
          margin: '0'
        }}>
          Revealing Soon…
        </p>
      </div>
    </div>
  );
};

export default App;