import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010205);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.2, 3.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 2. Environment Map (PBR Reflections)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// 3. Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.01;
controls.target.set(0, 0, 0);

// 4. สร้างดวงดาวระยิบระยับรอบอวกาศ
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 2000;
const starPositions = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 120;
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

const starsMaterial = new THREE.PointsMaterial({
    color: 0x99ddff,
    size: 0.18,
    transparent: true,
    opacity: 0.9,
});

const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

// 5. Lighting ส่องประกายเมทัลลิก
const ambientLight = new THREE.AmbientLight(0x1a2639, 1.0);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 4.0);
mainLight.position.set(5, 8, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.bias = -0.0001;
scene.add(mainLight);

const blueLight = new THREE.PointLight(0x00f0ff, 5.0, 12);
blueLight.position.set(-3, 2, 3);
scene.add(blueLight);

const purpleLight = new THREE.PointLight(0x9d00ff, 4.0, 12);
purpleLight.position.set(3, 2, -3);
scene.add(purpleLight);

// 6. พื้นโลหะ Sci-Fi พรีเมียม (สร้างลายตารางไฮเทคด้วย Canvas Texture สดๆ คมชัด ไม่มีเบลอ)
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d');

// วาดลวดลายแผ่นเหล็กและช่องตาราง
ctx.fillStyle = '#111726';
ctx.fillRect(0, 0, 512, 512);

ctx.strokeStyle = '#25354d';
ctx.lineWidth = 6;
ctx.strokeRect(0, 0, 512, 512);

// เส้นตารางย่อยภายใน
ctx.lineWidth = 2;
for(let i = 64; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, 512);
    ctx.moveTo(0, i); ctx.lineTo(512, i);
    ctx.stroke();
}

const customFloorTex = new THREE.CanvasTexture(canvas);
customFloorTex.wrapS = THREE.RepeatWrapping;
customFloorTex.wrapT = THREE.RepeatWrapping;
customFloorTex.repeat.set(8, 8);

const floorGeo = new THREE.PlaneGeometry(50, 50);
const floorMat = new THREE.MeshStandardMaterial({ 
    map: customFloorTex,
    color: 0x889bbd,
    roughness: 0.18,       // เงากำลังดี สะท้อนแสงไฟนีออนเป็นทางสวยงาม
    metalness: 0.92,       // ความเป็นโลหะสูง
    bumpMap: customFloorTex,
    bumpScale: 0.03
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.32;  // วางระดับพอดีกับหมวกเป๊ะ
floor.receiveShadow = true;
scene.add(floor);

// เพิ่ม Grid เรืองแสงซ้อนทับอีกชั้นเพิ่มความล้ำ
const grid = new THREE.GridHelper(50, 50, 0x00f0ff, 0x1f304f);
grid.position.y = -0.31;
grid.material.transparent = true;
grid.material.opacity = 0.25;
scene.add(grid);

// 7. โหลดตัวละครหลัก: DamagedHelmet.glb
const loadingElement = document.getElementById('loading');
const loader = new GLTFLoader();

let helmetModel = null;

loader.load(
    'DamagedHelmet.glb',
    function (gltf) {
        helmetModel = gltf.scene;
        helmetModel.position.set(0, 0.59, 0); 
        helmetModel.scale.set(1, 1, 1);
        
        helmetModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(helmetModel);

        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    },
    function (xhr) {
        if (xhr.total > 0) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            if (loadingElement) {
                loadingElement.innerText = `กำลังโหลดโมเดล PBR... ${percent}%`;
            }
        }
    },
    function (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดโมเดล:', error);
        if (loadingElement) {
            loadingElement.innerText = 'ไม่พบไฟล์ DamagedHelmet.glb กรุณาตรวจสอบชื่อไฟล์ในโฟลเดอร์';
        }
    }
);

// 8. GUI สำหรับปรับแต่ง
const gui = new GUI({ title: 'PBR Properties & Lighting' });

const lightFolder = gui.addFolder('Light Controls');
lightFolder.add(mainLight.position, 'x', -10, 10, 0.1).name('แสงหลัก X');
lightFolder.add(mainLight.position, 'y', 0, 10, 0.1).name('แสงหลัก Y');
lightFolder.add(mainLight, 'intensity', 0, 5, 0.1).name('ความเข้มแสงหลัก');

const materialFolder = gui.addFolder('Floor PBR Properties');
materialFolder.add(floorMat, 'roughness', 0, 1, 0.05).name('ความเงาพื้น (Roughness)');
materialFolder.add(floorMat, 'metalness', 0, 1, 0.05).name('ความเป็นโลหะ (Metalness)');

// 9. Animation Loop
function animate() {
    requestAnimationFrame(animate);

    if (starField) {
        starField.rotation.y += 0.0005;
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// 10. Responsive
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});