// FILE: src/App.jsx
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./App.css";

// ── Shop data (Phnom Penh Locations) ───────────────────────────────────────
const SHOPS = [
  {
    name: "Beauty Story",
    branch: "Sonthormuk",
    status: "OPEN NOW",
    hours: "8:30 AM - 9:00 PM",
    tag: "WHOLESALER",
    phone: "017 755 571",
    x: 42, y: 35,
  },
  {
    name: "Jomros Store",
    branch: "Bak Touk",
    status: "OPEN NOW",
    hours: "8:00 AM - 8:00 PM",
    tag: "RETAIL",
    phone: "012 345 678",
    x: 65, y: 28,
  },
  {
    name: "MNC Store",
    branch: "Olympic Market",
    status: "OPEN NOW",
    hours: "9:00 AM - 9:00 PM",
    tag: "RETAIL",
    phone: "098 765 432",
    x: 68, y: 65,
  },
  {
    name: "Jomros Store",
    branch: "Vanda Institute",
    status: "OPEN NOW",
    hours: "8:00 AM - 8:00 PM",
    tag: "RETAIL",
    phone: "012 345 678",
    x: 55, y: 78,
  }
];

// ── SVG Mini-Map (Google Maps Style) ────────────────────────────────────────
function MiniMap({ activeShop, isActive }) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#f0fdf4" }}>
      {/* Grid lines / Minor roads */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        {[...Array(15)].map((_, i) => (
          <line key={`v${i}`} x1={`${(i + 1) * 6.66}%`} y1="0" x2={`${(i + 1) * 6.66}%`} y2="100%" stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke="#e2e8f0" strokeWidth="1" />
        ))}
      </svg>

      {/* Major Roads and Landmarks */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Olympic Stadium Green Area */}
        <rect x="58" y="48" width="18" height="14" rx="3" fill="#bbf7d0" opacity="0.8" />
        
        {/* Major Arteries */}
        <path d="M0,40 Q40,35 100,20" stroke="#cbd5e1" strokeWidth="3" fill="none" />
        <path d="M45,0 L55,100" stroke="#cbd5e1" strokeWidth="2.5" fill="none" />
        <path d="M10,100 Q40,60 100,55" stroke="#cbd5e1" strokeWidth="2.5" fill="none" />
        <path d="M75,0 L65,100" stroke="#cbd5e1" strokeWidth="2" fill="none" />
      </svg>

      {/* Pins */}
      {SHOPS.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          transform: isActive ? "translate(-50%, -100%) scale(1)" : "translate(-50%, -100%) scale(0.5)",
          opacity: isActive ? 1 : 0,
          transition: `opacity 0.5s ease ${isActive ? i * 0.15 : 0}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${isActive ? i * 0.15 : 0}s`,
          zIndex: activeShop === i ? 20 : 10,
        }}>
          {/* Map Label */}
          <div style={{
            position: "absolute",
            left: 20, top: -10,
            background: "white",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 700,
            color: activeShop === i ? "#111827" : "#64748b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            whiteSpace: "nowrap",
            border: activeShop === i ? "1px solid #111827" : "1px solid #e2e8f0",
            transform: "translateY(-50%)",
            transition: "all 0.3s ease",
            zIndex: 2,
          }}>
            {p.name.toUpperCase()} {p.branch ? `(${p.branch.toUpperCase()})` : ''}
          </div>

          {/* Map Pin */}
          <div style={{
            width: activeShop === i ? 28 : 22,
            height: activeShop === i ? 28 : 22,
            background: activeShop === i ? "#111827" : "#3b82f6", 
            borderRadius: "50% 50% 50% 0",
            transform: "rotate(-45deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid white",
            boxShadow: activeShop === i ? "0 8px 16px rgba(0,0,0,0.3)" : "0 4px 8px rgba(0,0,0,0.15)",
            transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <div style={{
              width: activeShop === i ? 10 : 6,
              height: activeShop === i ? 10 : 6,
              background: "white",
              borderRadius: "50%",
              transition: "all 0.3s ease"
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Three.js product renderer ───────────────────────────────────────────────
function useThreeScene(canvasRef, scrollProgress, dragRef, reducedMotion) {
  const sceneRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || startedRef.current) return;
    startedRef.current = true;
    
    const canvas = canvasRef.current;
    
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8); 
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.5); 
    dir.position.set(5, 5, 5); 
    scene.add(dir);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8); 
    fillLight.position.set(-3, 0, 5);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xa78bfa, 2.0, 12); 
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new GLTFLoader();
    loader.load(
      '/product.glb', 
      (gltf) => {
        const model = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // Product scale reduced for better viewport fit (~70% of height)
        model.scale.set(1.4, 1.4, 1.4); 
        
        group.add(model);
      }, 
      undefined, 
      (error) => {
        console.error('Error loading product.glb, using fallback mesh:', error);
        const fallbackGeo = new THREE.CapsuleGeometry(0.5, 0.8, 4, 16);
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
        const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
        group.add(fallbackMesh);
      }
    );

    // Particle Count reduced for subtlety
    const particleCount = 30;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x000000, size: 0.03, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    sceneRef.current = { renderer, scene, camera, group, particles, rimLight };

    const onResize = () => {
      const w2 = canvas.clientWidth;
      const h2 = canvas.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2, false);
    };
    window.addEventListener("resize", onResize);

    let raf;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.01;

      const prog = scrollProgress.current || 0;
      const d = dragRef.current;

      if (!d.dragActive && !reducedMotion) {
        d.rotOffsetX += d.velY;
        d.rotOffsetY += d.velX;
        d.velX *= 0.92;
        d.velY *= 0.92;
      }
      d.rotOffsetX = Math.max(-0.35, Math.min(0.35, d.rotOffsetX));

      // Calculate smooth target locations using Lerp
      let targetX = 0;
      let targetY = 0;
      let targetScale = 1;
      let targetCamZ = 5;
      let targetRimInt = 2.0;

      if (prog < 0.33) {
        targetY = Math.sin(t * 0.8) * 0.08;
      } else if (prog < 0.66) {
        const spin = (prog - 0.33) / 0.33;
        targetY = Math.sin(t * 0.8) * 0.04;
        targetScale = 1 + spin * 0.08;
        targetRimInt = 2.0 + spin * 1.0;
        rimLight.color.setHSL(0.75 + spin * 0.1, 0.9, 0.6);
      } else {
        const mapProg = (prog - 0.66) / 0.34;
        targetX = -1.5 * mapProg;
        targetY = 0.8 * mapProg + Math.sin(t * 0.8) * 0.04 * (1 - mapProg);
        targetScale = 1.08 - mapProg * 0.55;
        targetCamZ = 5 + mapProg * 1;
        targetRimInt = 3.0 - mapProg * 1.5;
      }

      // Apply lerp for smooth transitions
      const lerpSpeed = reducedMotion ? 1.0 : 0.08;
      group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, lerpSpeed);
      group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, lerpSpeed);
      group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, targetScale, lerpSpeed));
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, lerpSpeed);
      rimLight.intensity = THREE.MathUtils.lerp(rimLight.intensity, targetRimInt, lerpSpeed);

      // Handle custom rotation via explicit offset lerping to avoid snapping
      let targetSpinOffset = 0;
      if (prog >= 0.33 && prog < 0.66) {
        const spin = (prog - 0.33) / 0.33;
        const spinFactor = d.dragActive ? 0.2 : 1.0;
        targetSpinOffset = spin * Math.PI * 2 * spinFactor;
      }
      
      if (d.currentSpinOffset === undefined) d.currentSpinOffset = 0;
      d.currentSpinOffset = THREE.MathUtils.lerp(d.currentSpinOffset, targetSpinOffset, lerpSpeed);

      group.rotation.y = t * 0.3 + d.currentSpinOffset + d.rotOffsetY;
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, d.rotOffsetX, lerpSpeed);

      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      
      group.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
      
      if (pGeo) pGeo.dispose();
      if (pMat) pMat.dispose();
      renderer.dispose();
      startedRef.current = false;
    };
  }, [reducedMotion]);
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const interactRef = useRef(null);
  
  const scrollProgress = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [activeShop, setActiveShop] = useState(0);
  const [showHint, setShowHint] = useState(true);

  const [reducedMotion] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  const dragRef = useRef({
    dragActive: false,
    lastX: 0,
    lastY: 0,
    rotOffsetX: 0,
    rotOffsetY: 0,
    velX: 0,
    velY: 0,
    lastTap: 0
  });

  useThreeScene(canvasRef, scrollProgress, dragRef, reducedMotion);

  // Auto-hide product interaction hint
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const max = container.scrollHeight - container.clientHeight;
      const prog = max > 0 ? container.scrollTop / max : 0;
      scrollProgress.current = prog;

      if (prog < 0.33) {
        setChapter(0);
      } else if (prog < 0.66) {
        setChapter(1);
      } else {
        setChapter(2);
        const mapProg = (prog - 0.66) / 0.34;
        setActiveShop(Math.min(SHOPS.length - 1, Math.floor(mapProg * SHOPS.length)));
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const handlePointerDown = (e) => {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    
    const minX = ww * 0.2;
    const maxX = ww * 0.8;
    const minY = wh * 0.2;
    const maxY = wh * 0.8;

    if (e.clientX >= minX && e.clientX <= maxX && e.clientY >= minY && e.clientY <= maxY) {
      const d = dragRef.current;
      d.dragActive = true;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.velX = 0;
      d.velY = 0;
      
      if (interactRef.current) {
        interactRef.current.setPointerCapture(e.pointerId);
      }

      const now = Date.now();
      if (now - d.lastTap < 300) {
        d.rotOffsetX = 0;
        d.rotOffsetY = 0;
      }
      d.lastTap = now;
      
      setShowHint(false); // Hide hint once user interacts
    }
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d.dragActive) return;
    
    if (e.cancelable) {
      e.preventDefault();
    }

    const deltaX = e.clientX - d.lastX;
    const deltaY = e.clientY - d.lastY;
    const speed = 0.005;

    d.rotOffsetY += deltaX * speed;
    d.rotOffsetX += deltaY * speed;
    
    d.velX = deltaX * speed * 0.5;
    d.velY = deltaY * speed * 0.5;

    d.lastX = e.clientX;
    d.lastY = e.clientY;
  };

  const handlePointerUp = (e) => {
    const d = dragRef.current;
    if (!d.dragActive) return;
    d.dragActive = false;
    
    if (interactRef.current) {
      try {
        interactRef.current.releasePointerCapture(e.pointerId);
      } catch (err) { }
    }
  };

  const shop = SHOPS[activeShop] || SHOPS[0];

  return (
    <div style={{ width: "100%", height: "100vh", background: "#ffffff", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden", position: "relative" }}>

      <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "scroll", zIndex: 10, pointerEvents: "auto", WebkitOverflowScrolling: "touch" }}>
        <div 
          ref={interactRef}
          style={{
            position: "sticky", 
            top: 0,
            left: 0,
            width: "100%",
            height: "100vh",
            zIndex: 15, 
            pointerEvents: chapter === 2 ? "none" : "auto", 
            touchAction: "pan-y" 
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div style={{ height: "200vh", pointerEvents: "none" }} />
      </div>

      <canvas ref={canvasRef} style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        zIndex: 1, pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: chapter === 0
          ? "radial-gradient(ellipse at 60% 40%, #f3f4f6 0%, #ffffff 70%)"
          : chapter === 1
          ? "radial-gradient(ellipse at 40% 50%, #e5e7eb 0%, #ffffff 70%)"
          : "radial-gradient(ellipse at 50% 50%, #ffffff 0%, #ffffff 100%)",
        transition: "background 1.2s ease",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        opacity: chapter === 2 ? 1 : 0,
        transition: "opacity 0.8s ease",
        pointerEvents: chapter === 2 ? "auto" : "none",
      }}>
        <MiniMap activeShop={activeShop} isActive={chapter === 2} />
      </div>

      {/* Persistent UI Layer */}
      <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}>

        {/* Story Progress Indicator */}
        <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", zIndex: 40, display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: chapter === i ? "#7c3aed" : "#cbd5e1",
              transform: `scale(${chapter === i ? 1.5 : 1})`,
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)"
            }} />
          ))}
        </div>

        {/* Drag Interaction Hint */}
        <div style={{
          position: "absolute", top: "55%", left: "50%", transform: "translate(-50%, -50%)",
          opacity: chapter === 0 && showHint ? 1 : 0, transition: "opacity 0.8s ease",
          pointerEvents: "none", zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <span style={{ fontSize: 16 }}>⟷</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#111827', letterSpacing: 1 }}>DRAG TO ROTATE</span>
          </div>
        </div>

        {/* Chapter 0 Content */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          justifyContent: "flex-end", alignItems: "center",
          paddingBottom: "12vh", paddingLeft: 24, paddingRight: 24,
          opacity: chapter === 0 ? 1 : 0,
          transform: chapter === 0 ? "translateY(0)" : "translateY(-24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            {/* Chapter Label */}
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#64748b", marginBottom: 16 }}>INTRODUCING</div>
            
            <div style={{
              display: "inline-block", background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.3)", borderRadius: 20,
              padding: "4px 14px", marginBottom: 16,
              color: "#7c3aed", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase",
            }}>New Collection 2025</div>
            <h1 style={{
              margin: "0 0 12px", fontSize: "clamp(32px, 8vw, 52px)",
              fontWeight: 800, lineHeight: 1.05,
              background: "linear-gradient(135deg, #111827 40%, #7c3aed)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: -1,
            }}>Welcome to<br />NovaCare</h1>
            <p style={{ color: "#4b5563", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
              Science-backed skincare, crafted for every skin story.
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{
          position: "absolute", bottom: "4vh", left: "50%", transform: "translateX(-50%)",
          opacity: chapter === 0 ? 1 : 0, transition: "opacity 0.5s ease", zIndex: 30
        }}>
          <div className="animate-bounce-subtle" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ fontSize: 14 }}>↓</span>
            <span>SCROLL TO EXPLORE</span>
          </div>
        </div>

        {/* Chapter 1 Content */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          justifyContent: "flex-end", alignItems: "flex-start",
          paddingBottom: "10vh", paddingLeft: 28, paddingRight: 28,
          opacity: chapter === 1 ? 1 : 0,
          transform: chapter === 1 ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{ maxWidth: 300 }}>
            {/* Chapter Label */}
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#64748b", marginBottom: 16 }}>THE FORMULA</div>
            
            <div style={{ color: "#7c3aed", fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Signature Formula</div>
            <h2 style={{ margin: "0 0 14px", fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
              Hydra-Repair<br />Serum Pro
            </h2>
            {[
              { icon: "◈", text: "72-hour deep hydration lock" },
              { icon: "◈", text: "Retinol + Hyaluronic complex" },
              { icon: "◈", text: "Dermatologist tested & approved" },
            ].map((b, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10,
                opacity: chapter === 1 ? 1 : 0,
                transform: chapter === 1 ? "translateX(0)" : "translateX(-12px)",
                transition: `opacity 0.5s ease ${i * 0.1 + 0.2}s, transform 0.5s ease ${i * 0.1 + 0.2}s`,
              }}>
                <span style={{ color: "#7c3aed", fontSize: 16, lineHeight: 1.4 }}>{b.icon}</span>
                <span style={{ color: "#374151", fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{b.text}</span>
              </div>
            ))}
            <button style={{
              marginTop: 16, padding: "12px 28px",
              background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
              border: "none", borderRadius: 30,
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 8px 32px rgba(167,139,250,0.3)",
              pointerEvents: "auto",
            }}>
              Discover the Formula →
            </button>
          </div>
        </div>

        {/* Chapter 2 Content */}
        <div style={{
          position: "absolute",
          left: "5%",
          top: "50%",
          width: "90%",
          maxWidth: 320,
          transform: `translateY(-50%) ${chapter === 2 ? 'translateX(0)' : 'translateX(-40px)'}`,
          opacity: chapter === 2 ? 1 : 0,
          transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)",
          pointerEvents: chapter === 2 ? "auto" : "none",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Chapter Label */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#64748b", marginBottom: 16 }}>STORE LOCATIONS</div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 24, width: "fit-content" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#64748b" }}>
              -
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#64748b" }}>BACK TO LIST</div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 300, margin: "0 0 12px 0", letterSpacing: 2, color: "#111827", fontFamily: "Times New Roman, serif" }}>
            {shop.name.toUpperCase()}
          </h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ background: "#111827", color: "white", fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 12, letterSpacing: 1 }}>
              {shop.status}
            </span>
          </div>
          
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 24 }}>
            {shop.hours}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0 0 24px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div>
                <div style={{ fontSize: 13, color: "#111827", fontWeight: 600, marginBottom: 6 }}>
                  {shop.name} {shop.branch}
                </div>
                {shop.tag && (
                  <span style={{ border: "1px solid #cbd5e1", color: "#64748b", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 2, letterSpacing: 0.5 }}>
                    {shop.tag}
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 18 }}>📞</span>
              <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{shop.phone}</div>
            </div>
          </div>

          <button style={{
            width: "100%",
            background: "#111827",
            color: "white",
            border: "none",
            padding: "16px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 2,
            cursor: "pointer",
            borderRadius: 4,
            transition: "background 0.2s ease"
          }}
          onMouseOver={(e) => e.target.style.background = "#334155"}
          onMouseOut={(e) => e.target.style.background = "#111827"}
          >
            GET DIRECTIONS
          </button>
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "rgba(0,0,0,0.05)" }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
            width: `${((chapter + 1) / 3) * 100}%`,
            transition: "width 0.4s ease",
          }} />
        </div>

        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.9), transparent)",
        }}>
          <div style={{
            fontSize: 16, fontWeight: 800, letterSpacing: -0.5,
            background: "linear-gradient(135deg, #111827, #7c3aed)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>NOVA<span style={{ fontWeight: 300 }}>CARE</span></div>
          <div style={{ display: "flex", gap: 16, color: "#64748b", fontSize: 12 }}>
            {["Products", "Story", "Stores"].map((t, i) => (
              <span key={i} style={{ color: chapter === i ? "#7c3aed" : "#64748b", transition: "color 0.3s", fontWeight: chapter === i ? 700 : 500 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}