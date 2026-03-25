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

function createSparkleNormalMap() {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  
  for (let i = 0; i < imgData.data.length; i += 4) {
      let r = 128, g = 128, b = 255; 
      if (Math.random() > 0.5) { 
          r = Math.random() * 255;
          g = Math.random() * 255;
      }
      imgData.data[i] = r;
      imgData.data[i+1] = g;
      imgData.data[i+2] = b;
      imgData.data[i+3] = 255;
  }
  
  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function useThreeScene(canvasRef, scrollProgress, dragRef, reducedMotion, threeContext, activeShade, setLoadProgress, setIsLoading) {
  const sceneRef = useRef(null);
  const startedRef = useRef(false);
  const texturesRef = useRef({ powder: {}, label: {}, sparkle: null });
  
  const currentShadeRef = useRef(activeShade);
  useEffect(() => {
      currentShadeRef.current = activeShade;
  }, [activeShade]);

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

    const manager = new THREE.LoadingManager();
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      setLoadProgress(Math.round((itemsLoaded / itemsTotal) * 100));
    };
    manager.onLoad = () => {
      setTimeout(() => setIsLoading(false), 600);
    };

    const tl = new THREE.TextureLoader(manager);
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

    if (!texturesRef.current.sparkle) {
        texturesRef.current.sparkle = createSparkleNormalMap();
    }

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    new RGBELoader(manager).load('/hdr/studio_small_08_1k.hdr', (texture) => {
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

    const loader = new GLTFLoader(manager);
    Promise.all(['/product.glb', '/product2.glb', '/product3.glb'].map((path, index) => {
      return new Promise((resolve) => {
        loader.load(path, (gltf) => {
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

            let cap = null;
            if (index === 0) {
                cap = nodes["CAP: [BLUSH POWDER].010"] || nodes["CAP"] || nodes["Cap.001"] || nodes["Cap"] || nodes["cap"] || nodes["Lid"];
                if (!cap) model.traverse((child) => { if (child.isMesh && (child.name.toLowerCase().includes('cap') || child.name.toLowerCase().includes('lid'))) cap = child; });
            } else if (index === 1) {
                cap = nodes["Cap"];
                if (!cap) model.traverse((child) => { if (child.name === 'Cap' || child.name === 'CAP') cap = child; });
            } else if (index === 2) {
                cap = nodes["bare cap"] || nodes["bare_cap"];
                if (!cap) model.traverse((child) => { if (child.name.toLowerCase().includes('cap')) cap = child; });
                
                model.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => {
                            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
                                mat.metalness = 0.0;
                                mat.roughness = 0.45;
                                mat.envMapIntensity = 0.6;
                            }
                        });
                    }
                });
            }

            if (cap) { 
                cap.userData.originalY = cap.position.y; 
                cap.userData.closedQuat = cap.quaternion.clone(); 
                
                const openQuat = cap.quaternion.clone();
                if (index === 2) {
                    openQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -1.8)); 
                } else {
                    openQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.5)); 
                }
                cap.userData.openQuat = openQuat;
            }

            const isCap = (child) => child === cap || child.parent === cap;

            let powderMesh = null;
            let labelMesh = null;
            let creamMesh = null;

            if (index === 0) { 
                model.traverse((child) => {
                    if (child.isMesh && !isCap(child)) {
                        const name = child.name.toLowerCase();
                        if (name === 'powdermesh' || name.includes('mesh.086') || name === 'powder') {
                            powderMesh = child;
                            powderMesh.material = new THREE.MeshStandardMaterial({ 
                                color: 0xffffff, 
                                roughness: 0.7, 
                                metalness: 0.2,
                                normalMap: texturesRef.current.sparkle,
                                normalScale: new THREE.Vector2(0.8, 0.8)
                            });
                        }
                        if (name === 'label.011' || name.includes('label') || name.includes('mesh.085')) {
                            if (!labelMesh) {
                                labelMesh = child;
                                labelMesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 });
                            }
                        }
                    }
                });
            }

            if (index === 1) {
                model.traverse((child) => {
                    if (child.isMesh && !isCap(child)) {
                        const name = child.name.toLowerCase();

                        if (Array.isArray(child.material)) {
                            const matIdx = child.material.findIndex(m => {
                                const mName = m.name.toLowerCase();
                                return !mName.includes('chrome') && !mName.includes('silver');
                            });
                            
                            if (matIdx !== -1) {
                                child.material = [...child.material]; 
                                child.material[matIdx] = new THREE.MeshStandardMaterial({
                                    color: new THREE.Color(SHADES[0].color),
                                    roughness: 0.85,
                                    metalness: 0.0
                                });
                                child.userData.creamMatIdx = matIdx;
                                creamMesh = child;
                            }
                        } else if (name.includes('cylinder.019') || name.includes('cream')) {
                            creamMesh = child;
                            creamMesh.material = new THREE.MeshStandardMaterial({
                                color: new THREE.Color(SHADES[0].color),
                                roughness: 0.85,
                                metalness: 0.0
                            });
                        }
                    }
                });
            }

            const wrapper = new THREE.Group();
            wrapper.userData.isOpen = false;
            wrapper.add(model);
            wrapper.scale.setScalar(0);
            wrapper.position.y = index === 0 ? -6 : (index === 1 ? 6 : 12); 
            group.add(wrapper);
            
            resolve({ index, wrapper, cap, powderMesh, labelMesh, creamMesh });
          }, 
          undefined, 
          (error) => {
            const fallbackMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.8, 4, 16), new THREE.MeshStandardMaterial({ color: 0x111827 }));
            fallbackMesh.scale.setScalar(0); fallbackMesh.position.y = -2;
            const wrapper = new THREE.Group(); wrapper.userData.isOpen = false; wrapper.add(fallbackMesh); group.add(wrapper);
            resolve({ index, wrapper, cap: null, powderMesh: null, labelMesh: null, creamMesh: null });
          }
        );
      });
    })).then((results) => {
      results.sort((a, b) => a.index - b.index);
      if (sceneRef.current) sceneRef.current.products = results;
    });

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

      const prog = scrollProgress.current || 0;
      const d = dragRef.current;
      const isMobile = window.innerWidth < 768;

      let activeIndex = prog < 0.33 ? 0 : prog < 0.66 ? 1 : 2;

      if (sceneRef.current?.products) {
          const currentShade = currentShadeRef.current;

          sceneRef.current.products.forEach((prod, i) => {
              if (i === 0) {
                  const targetPowderTex = texturesRef.current.powder[currentShade];
                  if (prod.powderMesh && targetPowderTex && prod.powderMesh.material.map !== targetPowderTex) {
                      prod.powderMesh.material.map = targetPowderTex;
                      prod.powderMesh.material.needsUpdate = true;
                  }

                  const targetLabelTex = texturesRef.current.label[currentShade];
                  if (prod.labelMesh && targetLabelTex && prod.labelMesh.material.map !== targetLabelTex) {
                      prod.labelMesh.material.map = targetLabelTex;
                      prod.labelMesh.material.needsUpdate = true;
                  }

              } else if (i === 1) {
                  if (prod.creamMesh) {
                      const targetColor = new THREE.Color(SHADES[currentShade].color);
                      if (prod.creamMesh.userData.creamMatIdx !== undefined) {
                          const mat = prod.creamMesh.material[prod.creamMesh.userData.creamMatIdx];
                          if (!mat.color.equals(targetColor)) {
                              mat.color.copy(targetColor);
                              mat.needsUpdate = true;
                          }
                      } else {
                          if (!prod.creamMesh.material.color.equals(targetColor)) {
                              prod.creamMesh.material.color.copy(targetColor);
                              prod.creamMesh.material.needsUpdate = true;
                          }
                      }
                  }
              }
          });
      }

      if (!d.dragActive && !reducedMotion) {
        d.rotOffsetX += d.velY; d.rotOffsetY += d.velX;
        d.velX *= 0.92; d.velY *= 0.92;
      }
      
      if (activeIndex === 0) {
          d.rotOffsetX = Math.max(-0.25, Math.min(0.65, d.rotOffsetX));
      }

      const targetX = isMobile ? 0 : -1.8; 
      const targetCamZ = isMobile ? 6.5 : 5;
      const targetRimInt = 1.5;
      rimLight.color.setHSL(0.75, 0.9, 0.6);

      const lerpSpeed = reducedMotion ? 1.0 : 0.08;
      group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, lerpSpeed);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, lerpSpeed);
      rimLight.intensity = THREE.MathUtils.lerp(rimLight.intensity, targetRimInt, lerpSpeed);

      if (sceneRef.current && sceneRef.current.products.length > 0) {
        sceneRef.current.products.forEach((prod, i) => {
            const isActiveModel = (activeIndex === i);
            
            const baseScale = (i === 0 ? 2.5 : i === 1 ? 2.4 : 0.25) * (isMobile ? 0.8 : 1.0);
            
            let pTargetScale = isActiveModel ? baseScale : 0;
            let pTargetY = isActiveModel ? Math.sin(t * 0.8) * 0.08 + (isMobile ? 0.9 : 0) : (i === 0 ? -6 : i === 1 ? 6 : 12);
            
            let capTargetY = prod.cap ? prod.cap.userData.originalY : 0;
            let targetQuat = prod.cap ? prod.cap.userData.closedQuat : null;

            if (prod.cap && prod.wrapper.userData.isOpen) {
                if (i === 0) {
                    targetQuat = prod.cap.userData.openQuat; 
                } else if (i === 1 || i === 2) { 
                    capTargetY = prod.cap.userData.originalY + 2.5; 
                }
            }

            prod.wrapper.scale.setScalar(THREE.MathUtils.lerp(prod.wrapper.scale.x, pTargetScale, lerpSpeed));
            prod.wrapper.position.y = THREE.MathUtils.lerp(prod.wrapper.position.y, pTargetY, lerpSpeed);

            if (prod.cap) {
                prod.cap.position.y = THREE.MathUtils.lerp(prod.cap.position.y, capTargetY, lerpSpeed * 1.5);
                if (i === 0 && targetQuat) { 
                    prod.cap.quaternion.slerp(targetQuat, lerpSpeed * 1.5);
                }
            }
        });
      }

      if (d.currentSpinOffset === undefined) d.currentSpinOffset = 0;
      d.currentSpinOffset = THREE.MathUtils.lerp(d.currentSpinOffset, 0, lerpSpeed);
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, d.rotOffsetY, lerpSpeed);
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
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const interactRef = useRef(null);
  const threeContext = useRef({});
  
  const scrollProgress = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const [activeShade, setActiveShade] = useState(0); 
  
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { threeContext.current.lastShade = activeShade; }, [activeShade]);

  const [reducedMotion] = useState(() => typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);

  const dragRef = useRef({
    dragActive: false, lastX: 0, lastY: 0, rotOffsetX: 0.4, rotOffsetY: 0,
    velX: 0, velY: 0, lastTap: 0, tapStartX: 0, tapStartY: 0, tapStartTime: 0
  });

  useThreeScene(canvasRef, scrollProgress, dragRef, reducedMotion, threeContext, activeShade, setLoadProgress, setIsLoading);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const max = container.scrollHeight - container.clientHeight;
      const prog = max > 0 ? container.scrollTop / max : 0;
      scrollProgress.current = prog;
      setChapter(prog < 0.33 ? 0 : prog < 0.66 ? 1 : 2);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (dragRef.current) {
        dragRef.current.rotOffsetX = chapter === 0 ? 0.4 : 0;
        dragRef.current.rotOffsetY = 0;
        dragRef.current.velX = 0;
        dragRef.current.velY = 0;
    }
  }, [chapter]);

  const handleResetPosition = () => {
    if (dragRef.current) {
        dragRef.current.rotOffsetX = chapter === 0 ? 0.4 : 0;
        dragRef.current.rotOffsetY = 0;
        dragRef.current.velX = 0;
        dragRef.current.velY = 0;
    }
  };

  const handlePointerDown = (e) => {
    const d = dragRef.current;
    d.dragActive = true; d.lastX = e.clientX; d.lastY = e.clientY; d.velX = 0; d.velY = 0;
    d.tapStartX = e.clientX; d.tapStartY = e.clientY; d.tapStartTime = Date.now();
    if (interactRef.current) interactRef.current.setPointerCapture(e.pointerId);
    if (Date.now() - d.lastTap < 300) { d.rotOffsetX = chapter === 0 ? 0.4 : 0; d.rotOffsetY = 0; }
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

  const RenderSwatches = () => (
    <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
      {SHADES.map((swatch, idx) => {
        const isOut = swatch.status === 'out';
        const isActive = activeShade === idx;
        return (
          <div 
            key={idx} 
            onClick={() => { if (!isOut) setActiveShade(idx); }}
            style={{ 
              width: 44, height: 44, backgroundColor: swatch.color, 
              backgroundImage: `url("${swatch.texture}")`, backgroundSize: 'cover', backgroundPosition: 'center',
              border: isActive ? "2px solid #000" : "1px solid #e5e7eb", 
              position: "relative", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: isOut ? "not-allowed" : "pointer",
            }}
          >
            {isActive && <span style={{ color: "#000", fontSize: 24, zIndex: 2, fontWeight: 300 }}>✓</span>}
            
            {isOut && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3 }}>
                <span style={{ border: "2px solid #fca5a5", color: "#fca5a5", fontSize: 10, fontWeight: 800, padding: "2px 4px", borderRadius: 12, letterSpacing: 0.5 }}>OUT</span>
              </div>
            )}
            
            {!isOut && (
              <span style={{ position: "absolute", bottom: 0, right: 0, background: "#fff", borderTopLeftRadius: 4, border: "1px solid #e5e7eb", borderRight: "none", borderBottom: "none", color: "#111", fontSize: 10, fontWeight: 700, padding: "1px 4px" }}>
                {swatch.stock}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ width: "100%", height: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: "hidden", position: "relative" }}>
      
      <div style={{
        position: 'absolute', inset: 0, zIndex: 100, background: '#ffffff',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: isLoading ? 1 : 0, pointerEvents: isLoading ? 'auto' : 'none',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: 4, marginBottom: 24, fontFamily: "'Times New Roman', serif", color: '#111827' }}>BARE</div>
        <div style={{ width: '180px', height: '2px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${loadProgress}%`, height: '100%', background: '#111827', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ fontSize: 10, marginTop: 12, letterSpacing: 2, color: '#64748b', fontWeight: 600 }}>{loadProgress}%</div>
      </div>

      <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", zIndex: 10, pointerEvents: "auto", WebkitOverflowScrolling: "touch" }}>
        <div ref={interactRef} style={{ position: "sticky", top: 0, left: 0, width: "100%", height: "100vh", zIndex: 15, touchAction: "pan-y" }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} />
        <div style={{ height: "300vh", pointerEvents: "none" }} />
      </div>

      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }} />

      <div style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%, -50%)", opacity: showHint && !isMobile && !isLoading ? 1 : 0, transition: "opacity 0.8s ease", pointerEvents: "none", zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <span style={{ fontSize: 16 }}>⟷👆</span><span style={{ fontSize: 11, fontWeight: 700, color: '#111827', letterSpacing: 1 }}>DRAG OR TAP</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: isMobile ? "35%" : "45%", left: isMobile ? "20px" : "10vw", zIndex: 40, opacity: isLoading ? 0 : 1, transition: "opacity 0.8s ease 0.4s" }}>
        <button 
            onClick={handleResetPosition}
            style={{ 
                background: "rgba(255,255,255,0.9)", border: "none", padding: "8px 16px", 
                borderRadius: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                fontSize: "11px", fontWeight: "700", letterSpacing: "1px", color: "#111",
                cursor: "pointer", pointerEvents: "auto", transition: "transform 0.2s ease"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
            ↺ RESET
        </button>
      </div>

      {/* SECTION 1 */}
      <div style={{
        position: "absolute",
        inset: isMobile ? "auto 0 0 0" : "0 0 0 0",
        height: isMobile ? "55vh" : "100%",
        display: "flex", flexDirection: "column",
        justifyContent: isMobile ? "flex-start" : "center", alignItems: isMobile ? "center" : "flex-end", 
        paddingRight: isMobile ? 0 : "10vw",
        padding: isMobile ? "32px 24px 24px 24px" : "0 10vw 0 0",
        background: isMobile ? "#ffffff" : "transparent",
        zIndex: 20, 
        pointerEvents: "none",
        opacity: chapter === 0 && !isLoading ? 1 : 0, 
        transform: !isLoading ? (chapter === 0 ? "translateY(0)" : "translateY(24px)") : "translateY(24px)", 
        transition: "opacity 0.7s ease, transform 0.7s ease"
      }}>
        <div style={{ 
          width: "100%", maxWidth: isMobile ? "100%" : "420px", color: "#111", textAlign: "left", fontFamily: "'Century Gothic', 'Helvetica Neue', sans-serif",
          pointerEvents: chapter === 0 && !isLoading ? "auto" : "none",
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 300, margin: "0 0 16px", letterSpacing: 0.5, color: "#111827" }}>BARE Shimmer Blush Powder</h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, marginBottom: 12 }}>
            <span style={{ background: "#000", color: "#fff", fontSize: 10, fontWeight: 700, padding: "6px 10px", letterSpacing: 1 }}>BESTSELLER</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, letterSpacing: 2 }}>★★★★★</span> <span style={{ fontSize: 12, color: "#64748b", textDecoration: "underline" }}>(3) Rate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ color: "#10b981", fontSize: 16 }}>●</span><span style={{ color: "#10b981", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>IN STOCK</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>$12.00</div>
          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 24px" }} />
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>SHADE: {SHADES[activeShade].name}</div>
          
          <RenderSwatches />

          <button style={{ width: "100%", padding: "20px", background: "#000", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, letterSpacing: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> ADD TO CART
          </button>
        </div>
      </div>

      {/* SECTION 2 */}
      <div style={{
        position: "absolute",
        inset: isMobile ? "auto 0 0 0" : "0 0 0 0",
        height: isMobile ? "55vh" : "100%",
        display: "flex", flexDirection: "column",
        justifyContent: isMobile ? "flex-start" : "center", alignItems: isMobile ? "center" : "flex-end", 
        paddingRight: isMobile ? 0 : "10vw",
        padding: isMobile ? "32px 24px 24px 24px" : "0 10vw 0 0",
        background: isMobile ? "#ffffff" : "transparent",
        zIndex: 20, 
        pointerEvents: "none", 
        opacity: chapter === 1 && !isLoading ? 1 : 0, 
        transform: !isLoading ? (chapter === 1 ? "translateY(0)" : "translateY(24px)") : "translateY(24px)", 
        transition: "opacity 0.7s ease, transform 0.7s ease"
      }}>
        <div style={{ 
          width: "100%", maxWidth: isMobile ? "100%" : "420px", color: "#111", textAlign: "left", fontFamily: "'Century Gothic', 'Helvetica Neue', sans-serif",
          pointerEvents: chapter === 1 && !isLoading ? "auto" : "none",
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 300, margin: "0 0 16px", letterSpacing: 0.5, color: "#111827" }}>BARE Creamy Blush Stick</h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, marginBottom: 12 }}>
            <span style={{ background: "#000", color: "#fff", fontSize: 10, fontWeight: 700, padding: "6px 10px", letterSpacing: 1 }}>NEW RELEASE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, letterSpacing: 2 }}>★★★★★</span> <span style={{ fontSize: 12, color: "#64748b", textDecoration: "underline" }}>(12) Rate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ color: "#10b981", fontSize: 16 }}>●</span><span style={{ color: "#10b981", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>IN STOCK</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>$14.00</div>
          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 24px" }} />
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>SHADE: {SHADES[activeShade].name}</div>
          
          <RenderSwatches />

          <button style={{ width: "100%", padding: "20px", background: "#000", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, letterSpacing: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> ADD TO CART
          </button>
        </div>
      </div>

      {/* SECTION 3 */}
      <div style={{
        position: "absolute",
        inset: isMobile ? "auto 0 0 0" : "0 0 0 0",
        height: isMobile ? "55vh" : "100%",
        display: "flex", flexDirection: "column",
        justifyContent: isMobile ? "flex-start" : "center", alignItems: isMobile ? "center" : "flex-end", 
        paddingRight: isMobile ? 0 : "10vw",
        padding: isMobile ? "32px 24px 24px 24px" : "0 10vw 0 0",
        background: isMobile ? "#ffffff" : "transparent",
        zIndex: 20, 
        pointerEvents: "none", 
        opacity: chapter === 2 && !isLoading ? 1 : 0, 
        transform: !isLoading ? (chapter === 2 ? "translateY(0)" : "translateY(24px)") : "translateY(24px)", 
        transition: "opacity 0.7s ease, transform 0.7s ease"
      }}>
        <div style={{ 
          width: "100%", maxWidth: isMobile ? "100%" : "420px", color: "#111", textAlign: "left", fontFamily: "'Century Gothic', 'Helvetica Neue', sans-serif",
          pointerEvents: chapter === 2 && !isLoading ? "auto" : "none",
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 300, margin: "0 0 16px", letterSpacing: 0.5, color: "#111827" }}>BARE Invisible Sunscreen</h1>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, marginBottom: 12 }}>
            <span style={{ background: "#000", color: "#fff", fontSize: 10, fontWeight: 700, padding: "6px 10px", letterSpacing: 1 }}>ESSENTIAL</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, letterSpacing: 2 }}>★★★★★</span> <span style={{ fontSize: 12, color: "#64748b", textDecoration: "underline" }}>(45) Rate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ color: "#10b981", fontSize: 16 }}>●</span><span style={{ color: "#10b981", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>IN STOCK</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>$18.00</div>
          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 24px" }} />

          <button style={{ width: "100%", padding: "20px", background: "#000", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, letterSpacing: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, cursor: "pointer", borderRadius: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> ADD TO CART
          </button>
        </div>
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "24px 20px", background: "none", zIndex: 50, pointerEvents: "none" }}>
        <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: 2, color: "#111827", fontFamily: "'Times New Roman', Times, serif", opacity: isLoading ? 0 : 1, transition: "opacity 0.8s ease 0.4s" }}>BARE</div>
      </div>
      {!isMobile && (
        <div style={{ position: "absolute", top: 0, right: 0, display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "28px 48px", zIndex: 50, opacity: isLoading ? 0 : 1, transition: "opacity 0.8s ease 0.4s" }}>
          <div style={{ display: "flex", gap: 32, color: "#64748b", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, pointerEvents: "auto" }}>
            {["Products", "Our Story", "Our Stores"].map((t, i) => (<span key={i} style={{ color: i === 0 ? "#111827" : "inherit", fontWeight: i === 0 ? 700 : 500, cursor: "pointer" }}>{t}</span>))}
          </div>
        </div>
      )}
    </div>
  );
}