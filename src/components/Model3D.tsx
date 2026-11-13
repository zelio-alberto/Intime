import { useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Visualizador 3D interativo de um equipamento (.glb). Carregado em lazy a
// partir da página Equipamentos — o three.js não entra no bundle das outras
// páginas. Iluminação própria (sem HDR de CDN) para ficar auto-contido.

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // Centrar na origem e normalizar o tamanho (o .glb pode vir em qualquer escala).
  const { scale, center } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const c = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(c);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { scale: 2.2 / maxDim, center: c };
  }, [scene]);

  return (
    <group scale={scale}>
      <primitive object={scene} position={[-center.x, -center.y, -center.z]} />
    </group>
  );
}

export default function Model3D({ url }: { url: string }) {
  return (
    <Canvas
      camera={{ position: [3.2, 1.6, 4.4], fov: 40 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} color="#7ab8ff" />
      <Suspense fallback={null}>
        <Model url={url} />
        <ContactShadows position={[0, -1.15, 0]} opacity={0.35} scale={8} blur={2.6} far={3} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.9}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}

useGLTF.preload("/models/starlink-standard.glb");
