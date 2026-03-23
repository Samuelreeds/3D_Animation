import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import "./App.css";

const SHADES = [
  { name: 'AMORE', texture: '/texture/Amore (3).png', status: 'in', stock: 193, color: '#c27964' },
  { name: 'OFF DUTY', texture: '/texture/Off Duty (3).png', status: 'out', stock: 0, color: '#e5e7eb' },
  { name: 'PINK CLOUD', texture: '/texture/Pink Cloud (3).png', status: 'out', stock: 0, color: '#fca5a5' },
  { name: 'BUBBLE', texture: '/texture/Bubble (3).png', status: 'in', stock: 86, color: '#f472b6' },
  { name: 'CARAMEL', texture: '/texture/Caramel (3).png', status: 'in', stock: 112, color: '#d97757' },
  { name: 'DEEP THROAT', texture: '/texture/Deep Throat (3).png', status: 'in', stock: 89, color: '#b0594a' },
  { name: 'DOLCE', texture: '/texture/Dolce (3).png', status: 'in', stock: 29, color: '#c05c5c' },
  { name: 'GIRL CRUSH', texture: '/texture/Girl Crush (3).png', status: 'in', stock: 71, color: '#e77369' },
  { name: 'HOT SAUCE', texture: '/texture/Hot Sauce (3).png', status: 'in', stock: 35, color: '#dc2626' },
  { name: 'TEDDY', texture: '/texture/Teddy (3).png', status: 'in', stock: 180, color: '#b95c50' }
];

function createLabelTexture(text, hexColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; 
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 512, 512);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 150px "Century Gothic", sans-serif'; 
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = '8px'; 
  }
  
  ctx.save();
  ctx.translate(256, 256);
  ctx.rotate(-Math.PI / 2); 
  ctx.fillText(text, 0, 0, 400); 
  ctx.restore();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

function useThreeScene(canvasRef, dragRef, reducedMotion, threeContext, activeShade) {
  const sceneRef = useRef(null);
  const startedRef = useRef(false);
  const texturesRef = useRef({ powder: {}, label: {} });
  
  const currentShadeRef = useRef(activeShade);
  useEffect(() => {
      currentShadeRef.current = activeShade;
  }, [activeShade]);

  useEffect(() => {
    const tl = new THREE.TextureLoader();
    SHADES.forEach((shade, i) => {
       if (shade.texture) {
           tl.load(shade.texture, (tex) => {
               tex.flipY = false; 
               tex.colorSpace = THREE.SRGBColorSpace;
               texturesRef.current.powder[i] = tex;
           });
       }
       texturesRef.current.label[i] = createLabelTexture(shade.name, shade.color);
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || startedRef.current) return;
    startedRef.current = true;
    
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.setClearColor(0xffffff, 0);

    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else renderer.outputEncoding = 3001; 
    
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    if (scene.environmentRotation !== undefined) scene.environmentRotation.y = Math.PI / 2;

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    new RGBELoader().load('/hdr/studio_small_08_1k.hdr', (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      texture.dispose();
      pmremGenerator.dispose();
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.5); scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 2.5); dir.position.set(5, 6, 4); scene.add(dir);
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2); fillLight.position.set(-5, 2, 6); scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xa78bfa, 1.5, 12); rimLight.position.set(-3, 3, -2); scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    if (threeContext) {
      threeContext.current.raycastTap = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);

        if (sceneRef.current?.products) {
            const interacts = [];
            sceneRef.current.products.forEach(prod => {
                if (prod.cap) {
                    const productIntersects = raycaster.intersectObject(prod.wrapper, true);
                    if (productIntersects.length > 0) {
                        interacts.push({ prod, intersect: productIntersects[0] });
                    }
                }
            });

            if (interacts.length > 0) {
                interacts.sort((a, b) => a.intersect.distance - b.intersect.distance);
                const activeProduct = interacts[0].prod;
                activeProduct.wrapper.userData.isOpen = !activeProduct.wrapper.userData.isOpen;
            }
        }
      };
    }

    const loader = new GLTFLoader();
    // Only load the first product
    loader.load('/product.glb', (gltf) => {
        const model = gltf.scene;
        const nodes = {};
        model.traverse((child) => { if (child.name) nodes[child.name] = child; });
        
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const mat = child.material;
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.metalness = Math.max(mat.metalness !== undefined ? mat.metalness : 0, 0.7);
              mat.roughness = Math.min(mat.roughness !== undefined ? mat.roughness : 1, 0.25);
              mat.envMapIntensity = 1.2;
              if (mat.map) {
                if (mat.map.colorSpace !== undefined) mat.map.colorSpace = THREE.SRGBColorSpace;
                else mat.map.encoding = 3001; 
              }
            }
          }
        });

        let cap = nodes["CAP: [BLUSH POWDER].010"] || nodes["CAP"] || nodes["Cap.001"] || nodes["Cap"] || nodes["cap"] || nodes["Lid"];
        if (!cap) model.traverse((child) => { if (child.isMesh && (child.name.toLowerCase().includes('cap') || child.name.toLowerCase().includes('lid'))) cap = child; });
        if (cap) { cap.userData.originalY = cap.position.y; cap.userData.originalRotX = cap.rotation.x; }

        let powderMesh = null;
        let labelMesh = null;

        model.traverse((child) => {
            if (child.isMesh) {
                if (child.name === 'PowderMesh' || child.name.includes('mesh.086') || child.name.toLowerCase().includes('powder')) {
                    powderMesh = child;
                }
                if (child.name === 'label.011' || child.name.includes('label') || child.name.includes('mesh.085')) {
                    labelMesh = child;
                }
            }
        });

        if (powderMesh) {
            powderMesh.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.1
            });
        }
        
        if (labelMesh) {
            labelMesh.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.1
            });
        }

        const wrapper = new THREE.Group();
        wrapper.userData.isOpen = false;
        wrapper.add(model);
        wrapper.scale.setScalar(0);
        wrapper.position.y = -2;
        group.add(wrapper);
        
        if (sceneRef.current) sceneRef.current.products = [{ index: 0, wrapper, cap, powderMesh, labelMesh }];
      }
    );

    sceneRef.current = { renderer, scene, camera, group, rimLight, products: [] };

    const onResize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    };
    window.addEventListener("resize", onResize);

    let raf;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.01;

      const d = dragRef.current;
      const isMobile = window.innerWidth < 768;

      if (sceneRef.current?.products?.[0]) {
          const product = sceneRef.current.products[0];
          const activeIndex = currentShadeRef.current;
          
          if (product.powderMesh) {
              const targetPowderTex = texturesRef.current.powder[activeIndex];
              if (targetPowderTex && product.powderMesh.material.map !== targetPowderTex) {
                  product.powderMesh.material.map = targetPowderTex;
                  product.powderMesh.material.needsUpdate = true;
              }
          }
          
          if (product.labelMesh) {
              const targetLabelTex = texturesRef.current.label[activeIndex];
              if (targetLabelTex && product.labelMesh.material.map !== targetLabelTex) {
                  product.labelMesh.material.map = targetLabelTex;
                  product.labelMesh.material.needsUpdate = true;
              }
          }
      }

      if (!d.dragActive && !reducedMotion) {
        d.rotOffsetX += d.velY; d.rotOffsetY += d.velX;
        d.velX *= 0.92; d.velY *= 0.92;
      }
      d.rotOffsetX = Math.max(-0.35, Math.min(0.35, d.rotOffsetX));

      const targetX = isMobile ? 0 : -1.8; 
      const targetCamZ = isMobile ? 6 : 5;
      const targetRimInt = 1.5;
      rimLight.color.setHSL(0.75, 0.9, 0.6);

      const lerpSpeed = reducedMotion ? 1.0 : 0.08;
      group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, lerpSpeed);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, lerpSpeed);
      rimLight.intensity = THREE.MathUtils.lerp(rimLight.intensity, targetRimInt, lerpSpeed);

      if (sceneRef.current && sceneRef.current.products.length > 0) {
        const prod = sceneRef.current.products[0];
        const baseScale = 3.5 * (isMobile ? 0.75 : 1.0);
        
        let pTargetScale = baseScale;
        let pTargetY = Math.sin(t * 0.8) * 0.08 + (isMobile ? 1.8 : 0);
        let capTargetY = prod.cap ? prod.cap.userData.originalY : 0;
        let capTargetRotX = prod.cap ? prod.cap.userData.originalRotX : 0;
        let targetRotZ = 0;

        if (prod.cap && prod.wrapper.userData.isOpen) {
            capTargetRotX = prod.cap.userData.originalRotX - 1.5; 
        }

        prod.wrapper.scale.setScalar(THREE.MathUtils.lerp(prod.wrapper.scale.x, pTargetScale, lerpSpeed));
        prod.wrapper.position.y = THREE.MathUtils.lerp(prod.wrapper.position.y, pTargetY, lerpSpeed);
        prod.wrapper.rotation.z = THREE.MathUtils.lerp(prod.wrapper.rotation.z, targetRotZ, lerpSpeed);

        if (prod.cap) {
          prod.cap.position.y = THREE.MathUtils.lerp(prod.cap.position.y, capTargetY, lerpSpeed * 1.5);
          prod.cap.rotation.x = THREE.MathUtils.lerp(prod.cap.rotation.x, capTargetRotX, lerpSpeed * 1.5);
        }
      }

      if (d.currentSpinOffset === undefined) d.currentSpinOffset = 0;
      d.currentSpinOffset = THREE.MathUtils.lerp(d.currentSpinOffset, 0, lerpSpeed);
      group.rotation.y = t * 0.3 + d.currentSpinOffset + d.rotOffsetY;
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, d.rotOffsetX, lerpSpeed);

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
            if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
            else child.material.dispose();
          }
        }
      });
      renderer.dispose();
      startedRef.current = false;
    };
  }, [reducedMotion, threeContext]); 
}

export default function App() {
  const canvasRef = useRef(null);
  const interactRef = useRef(null);
  const threeContext = useRef({});
  
  const [showHint, setShowHint] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const [activeShade, setActiveShade] = useState(0); 

  useEffect(() => { threeContext.current.lastShade = activeShade; }, [activeShade]);

  const [reducedMotion] = useState(() => typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);

  const dragRef = useRef({
    dragActive: false, lastX: 0, lastY: 0, rotOffsetX: 0, rotOffsetY: 0,
    velX: 0, velY: 0, lastTap: 0, tapStartX: 0, tapStartY: 0, tapStartTime: 0
  });

  useThreeScene(canvasRef, dragRef, reducedMotion, threeContext, activeShade);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handlePointerDown = (e) => {
    const d = dragRef.current;
    d.dragActive = true; d.lastX = e.clientX; d.lastY = e.clientY; d.velX = 0; d.velY = 0;
    d.tapStartX = e.clientX; d.tapStartY = e.clientY; d.tapStartTime = Date.now();
    if (interactRef.current) interactRef.current.setPointerCapture(e.pointerId);
    if (Date.now() - d.lastTap < 300) { d.rotOffsetX = 0; d.rotOffsetY = 0; }
    d.lastTap = Date.now();
    setShowHint(false);
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d.dragActive) return;
    if (e.cancelable) e.preventDefault();
    const speed = 0.005;
    d.rotOffsetY += (e.clientX - d.lastX) * speed; d.rotOffsetX += (e.clientY - d.lastY) * speed;
    d.velX = (e.clientX - d.lastX) * speed * 0.5; d.velY = (e.clientY - d.lastY) * speed * 0.5;
    d.lastX = e.clientX; d.lastY = e.clientY;
  };

  const handlePointerUp = (e) => {
    const d = dragRef.current;
    if (!d.dragActive) return;
    d.dragActive = false;
    if (d.tapStartTime && (Date.now() - d.tapStartTime < 300) && Math.hypot(e.clientX - d.tapStartX, e.clientY - d.tapStartY) < 10) {
      if (threeContext.current.raycastTap) threeContext.current.raycastTap(e.clientX, e.clientY);
    }
    if (interactRef.current) { try { interactRef.current.releasePointerCapture(e.pointerId); } catch (err) { } }
  };

  return (
    <div style={{ width: "100%", height: "100vh", background: "#ffffff", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden", position: "relative" }}>
      <div ref={interactRef} style={{ position: "absolute", inset: 0, zIndex: 15, touchAction: "none" }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} />

      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: "55%", left: "50%", transform: "translate(-50%, -50%)", opacity: showHint && !isMobile ? 1 : 0, transition: "opacity 0.8s ease", pointerEvents: "none", zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: 16 }}>⟷👆</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111827', letterSpacing: 1 }}>DRAG OR TAP</span>
        </div>
      </div>

      <div style={{
        position: "absolute",
        inset: isMobile ? "auto 0 0 0" : "0 0 0 0",
        display: "flex", flexDirection: "column",
        justifyContent: isMobile ? "flex-start" : "center", alignItems: isMobile ? "center" : "flex-end", 
        paddingRight: isMobile ? 0 : "10vw",
        padding: isMobile ? "24px 24px 48px 24px" : 0,
        background: isMobile ? "#ffffff" : "transparent",
        zIndex: 20, pointerEvents: "none",
      }}>
        <div style={{ 
          width: "100%", maxWidth: "420px", color: "#111", textAlign: "left", 
          fontFamily: "'Century Gothic', 'Helvetica Neue', sans-serif", 
          pointerEvents: "auto", 
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 400, margin: "0 0 16px", letterSpacing: 0.5 }}>BARE Shimmer Blush Powder</h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, marginBottom: 12 }}>
            <span style={{ background: "#000", color: "#fff", fontSize: 9, fontWeight: 700, padding: "4px 8px", letterSpacing: 1 }}>BESTSELLER</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, letterSpacing: 2 }}>★★★★★</span> <span style={{ fontSize: 11, color: "#666", textDecoration: "underline" }}>(3) Rate</span>
          </div>
          <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>● IN STOCK</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 24 }}>$12.00</div>
          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 24px" }} />
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, letterSpacing: 1 }}>SHADE: {SHADES[activeShade].name}</div>
          
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
            {SHADES.map((swatch, idx) => (
              <div 
                key={idx} 
                onClick={() => { if (swatch.status !== 'out') setActiveShade(idx); }}
                style={{ 
                  width: 36, height: 36, backgroundColor: swatch.color, 
                  backgroundImage: `url("${swatch.texture}")`, backgroundSize: 'cover', backgroundPosition: 'center',
                  border: activeShade === idx ? "2px solid #000" : "1px solid #e5e7eb", 
                  position: "relative", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: swatch.status === 'out' ? "not-allowed" : "pointer",
                  opacity: swatch.status === 'out' ? 0.6 : 1
                }}
              >
                {activeShade === idx && <span style={{ color: "#000", fontSize: 18, zIndex: 2 }}>✓</span>}
                {swatch.status === 'out' && <span style={{ position: "absolute", background: "rgba(255,255,255,0.9)", color: "#ef4444", fontSize: 9, fontWeight: 800, padding: "2px 4px", letterSpacing: 0.5, zIndex: 2 }}>OUT</span>}
                {swatch.status !== 'out' && <span style={{ position: "absolute", bottom: 2, right: 2, background: "rgba(255,255,255,0.9)", color: "#111", fontSize: 8, fontWeight: 800, padding: "1px 3px", borderRadius: 2 }}>{swatch.stock}</span>}
              </div>
            ))}
          </div>

          <button style={{ width: "100%", padding: "18px", background: "#000", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, letterSpacing: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> ADD TO CART
          </button>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 32, letterSpacing: 0.5 }}>• FREE DELIVERY OVER $50</div>
          <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}><div style={{ display: "flex", gap: 16 }}><span>+</span> <span>DETAILS</span></div><span style={{ transform: "scaleY(0.7)" }}>V</span></div>
          <div style={{ borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}><div style={{ display: "flex", gap: 16 }}><span>+</span> <span>SHIPPING & RETURNS</span></div><span style={{ transform: "scaleY(0.7)" }}>V</span></div>
        </div>
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "16px 20px", background: "none", zIndex: 50, pointerEvents: "none" }}>
        <div style={{ fontSize: 28, fontWeight: 400, letterSpacing: 1, color: "#111827", fontFamily: "'Times New Roman', Times, serif" }}>BARE</div>
      </div>
      {!isMobile && (
        <div style={{ position: "absolute", top: 0, right: 0, display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "16px 40px", zIndex: 50 }}>
          <div style={{ display: "flex", gap: 24, color: "#64748b", fontSize: 14, pointerEvents: "auto" }}>
            {["Products", "Our Story", "Our Stores"].map((t, i) => (<span key={i} style={{ color: i === 0 ? "#111827" : "inherit", fontWeight: i === 0 ? 600 : 400, cursor: "pointer" }}>{t}</span>))}
          </div>
        </div>
      )}
    </div>
  );
}