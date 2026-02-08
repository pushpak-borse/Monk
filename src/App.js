import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';

const LoadingScreen = ({ progress }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        marginBottom: '2rem'
      }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="4"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="50%" stopColor="#f7931e" />
              <stop offset="100%" stopColor="#ffd700" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffffff',
          fontSize: '1.5rem',
          fontWeight: '700',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif'
        }}>
          {Math.round(progress)}%
        </div>
      </div>
      
      <p style={{
        color: '#888888',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: '1rem',
        fontWeight: '300',
        letterSpacing: '0.05em',
        margin: 0
      }}>
        Preparing your experience…
      </p>
    </div>
  );
};

const WaveEffect = ({ reduceMotion }) => {
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
          
          float alpha = fadeEdge * fadeCenter * ripple * pulse * opacity * 0.35;
          
          vec3 color = mix(vec3(0.05, 0.2, 0.5), vec3(0.3, 0.9, 1.0), ripple);
          color += vec3(0.1, 0.3, 0.5) * pulse * 0.3;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useFrame((state) => {
    if (reduceMotion) return;
    
    const time = state.clock.elapsedTime;
    
    if (waveMaterial?.uniforms?.time) {
      waveMaterial.uniforms.time.value = time;
    }
    
    if (waveRef.current) {
      waveRef.current.rotation.z = time * 0.07;
    }
    if (wave2Ref.current) {
      wave2Ref.current.rotation.z = -time * 0.105;
    }
    if (wave3Ref.current) {
      wave3Ref.current.rotation.z = time * 0.056;
    }
  });

  if (reduceMotion) return null;

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

  const obj = useLoader(OBJLoader, '/monk.obj', (loader) => {
    // Loading progress handled by Suspense
  });

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
      rotation={[0, -Math.PI / 2, 0]}
    />
  );
};

const App = () => {
  const [showSubtitle, setShowSubtitle] = React.useState(false);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [textVisible, setTextVisible] = React.useState(false);
  const [showRotateHint, setShowRotateHint] = React.useState(true);
  const [hintOpacity, setHintOpacity] = React.useState(1);
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadProgress, setLoadProgress] = React.useState(0);
  const [reduceMotion, setReduceMotion] = React.useState(() => {
    return localStorage.getItem('reduceMotion') === 'true';
  });
  const [showGlow, setShowGlow] = React.useState(true);
  
  const toggleReduceMotion = () => {
    const newValue = !reduceMotion;
    setReduceMotion(newValue);
    localStorage.setItem('reduceMotion', newValue.toString());
  };
  
  React.useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
    
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setIsLoading(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    const subtitleTimer = setTimeout(() => setShowSubtitle(true), 1000);
    const textTimer = setTimeout(() => setTextVisible(true), 300);
    const hintTimer = setTimeout(() => setHintOpacity(0.2), 3000);
    const glowTimer = setTimeout(() => setShowGlow(false), 4000);
    
    return () => {
      clearInterval(progressInterval);
      clearTimeout(subtitleTimer);
      clearTimeout(textTimer);
      clearTimeout(hintTimer);
      clearTimeout(glowTimer);
    };
  }, []);
  return (
    <>
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          opacity: isLoading ? 1 : 0,
          transition: 'opacity 0.5s ease'
        }}>
          <LoadingScreen progress={loadProgress} />
        </div>
      )}
      
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000'
      }}>
      <div style={{
        flex: '0 0 auto',
        padding: '2.5rem 2rem 1.5rem',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          padding: '1rem',
          marginBottom: '2rem',
          textAlign: 'center',
          boxShadow: showGlow && !reduceMotion ? '0 0 40px rgba(255, 255, 255, 0.1)' : 'none',
          animation: showGlow && !reduceMotion ? 'pulseGlow 2s ease-in-out 2' : 'none',
          borderRadius: '10px'
        }}>
          {[
            "We're tuning the silence before the scale.",
            "Stay close, growth is about to get sorted."
          ].map((line, lineIndex) => (
            <div key={lineIndex} style={{ marginBottom: lineIndex === 0 ? '0.5rem' : '0' }}>
              {isTouchDevice ? (
                <div style={{
                  color: '#e0e0e0',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                  fontSize: 'clamp(1.125rem, 2.8vw, 1.5rem)',
                  fontWeight: '700',
                  lineHeight: '1.6',
                  letterSpacing: '0.02em',
                  opacity: textVisible ? 1 : 0,
                  transition: reduceMotion ? 'none' : 'opacity 0.8s ease'
                }}>
                  {line}
                </div>
              ) : (
                line.split(' ').map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    style={{
                      display: 'inline-block',
                      margin: '0 0.25rem',
                      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                      fontSize: 'clamp(1.125rem, 2.8vw, 1.5rem)',
                      fontWeight: '700',
                      lineHeight: '1.6',
                      letterSpacing: '0.02em',
                      color: '#e0e0e0',
                      cursor: 'pointer',
                      transition: reduceMotion ? 'none' : 'all 0.4s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      if (!reduceMotion) {
                        e.currentTarget.style.background = 'linear-gradient(90deg, #0099ff, #00ffff, #9933ff, #0099ff)';
                        e.currentTarget.style.backgroundSize = '200% auto';
                        e.currentTarget.style.webkitBackgroundClip = 'text';
                        e.currentTarget.style.webkitTextFillColor = 'transparent';
                        e.currentTarget.style.backgroundClip = 'text';
                        e.currentTarget.style.animation = 'shimmer 2s linear infinite';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!reduceMotion) {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.webkitTextFillColor = '#e0e0e0';
                        e.currentTarget.style.animation = 'none';
                      }
                    }}
                  >
                    {word}
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
        
        <div style={{
          background: reduceMotion ? 'linear-gradient(135deg, #ff6b35, #f7931e, #ffd700)' : 'linear-gradient(45deg, #ff6b35, #f7931e, #ffd700, #ff6b35)',
          backgroundSize: '300% 300%',
          animation: reduceMotion ? 'none' : 'gradientShift 6s ease-in-out infinite',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: 'clamp(1.7rem, 4.25vw, 3rem)',
          fontWeight: '800',
          lineHeight: '1.1',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          textShadow: '0 0 30px rgba(255, 107, 53, 0.3)',
          filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.4))',
          marginBottom: '1.5rem',
          padding: '1rem 0'
        }}>
          Entering Monk Mode…
        </div>
      </div>
      
      <div style={{ flex: '1 1 auto', minHeight: '0', position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          onPointerDown={() => setHasInteracted(true)}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <WaveEffect reduceMotion={reduceMotion} />
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
        
        {showRotateHint && !hasInteracted && (
          <div style={{
            position: 'absolute',
            bottom: '2rem',
            right: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            opacity: hintOpacity,
            transition: 'opacity 1s ease',
            pointerEvents: 'none'
          }}>
            <div style={{
              color: '#888888',
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              fontSize: '0.875rem',
              fontWeight: '300',
              letterSpacing: '0.03em'
            }}>
              Drag to rotate
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'rotateIcon 3s linear infinite'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </div>
          </div>
        )}
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
    </>
  );
};

export default App;