# Three.js — 3D yeteneği

Tarayıcıda WebGL ile 3D sahne kurma kütüphanesi: `three`
(repo: github.com/mrdoob/three.js). 3D görselleştirme, ürün gösterimi,
veri görselleştirme, oyun benzeri sahneler bu skill'in kapsamı.

## Ne zaman devreye girer
Görev 3D sahne, model gösterimi, WebGL canvas veya interaktif 3D istiyorsa.
2D bir UI için Three.js ekleme — gereksiz ağırlık.

## Kurulum
```
npm i three
npm i -D @types/three
```
React/Next.js projesinde imperatif Three.js yerine react-three-fiber tercih et:
```
npm i three @react-three/fiber @react-three/drei
```
`@react-three/drei` hazır yardımcılar verir (OrbitControls, loader'lar,
environment, vb.) — tekerleği yeniden icat etme.

## Temel iskelet (vanilla three)
Scene + Camera + Renderer + animasyon döngüsü:
```ts
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(w, h);
```

## Ne yap
- React'te `@react-three/fiber`'in `<Canvas>`'ını kullan — render döngüsünü,
  resize'ı ve temizliği o yönetir; elle `requestAnimationFrame` yazma.
- Animasyonu `renderer.setAnimationLoop(...)` veya r3f'te `useFrame` ile sür;
  `setAnimationLoop` WebXR ve sekme görünürlüğüyle uyumludur.
- `setPixelRatio`'yu 2 ile sınırla — retina ekranda GPU'yu boşa yorma.
- Geometry/material/texture'ları paylaş ve yeniden kullan; çok sayıda aynı
  nesne için `InstancedMesh`.
- Model yükleme: `GLTFLoader` ile `.glb`/`.gltf` (Draco/meshopt sıkıştırması
  varsa ilgili loader'ı bağla).
- Işık ekle — materyal `MeshStandardMaterial` ise ışıksız sahne siyah görünür.

## Bellek yönetimi (kritik)
WebGL kaynakları GC'ye takılmaz, elle bırakılır:
- Component unmount olurken `geometry.dispose()`, `material.dispose()`,
  `texture.dispose()`, `renderer.dispose()` çağır.
- r3f bunu sahne grafiğinden kaldırılan nesneler için otomatik yapar — yine de
  manuel oluşturduğun kaynakları izle.
- `resize` ve event listener'ları cleanup'ta kaldır.

## Next.js / SSR notu
- Three.js `window`/`WebGL` ister → 3D component `"use client"`.
- App Router'da `next/dynamic` ile `ssr: false` kullanarak yükle:
  `const Scene = dynamic(() => import('./Scene'), { ssr: false })`.
- Container ölçüsünü `ResizeObserver` ile takip et; camera `aspect` ve
  `renderer.setSize`'ı güncelle, `camera.updateProjectionMatrix()` çağır.

## Kırmızı bayraklar
- `dispose()` yok → sahne değişiminde/route geçişinde bellek sızıntısı.
- Her frame'de yeni `Vector3`/`Material`/`Geometry` allocate etmek.
- `setPixelRatio` sınırsız → düşük FPS.
- Devasa doku/model'i sıkıştırmadan yüklemek (10MB+ `.gltf`).
- 3D'yi server component'te import edip SSR'ı patlatmak.
- Görme engelli kullanıcı için 3D içeriğe metinsel alternatif sunmamak.
