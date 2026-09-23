import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { coastlines } from "./coastlines.js";
import { islandLayout } from "./island-layout.js";
import { openSite } from "./content-view.js";

const canvas = document.querySelector("#island-canvas");
const stage = document.querySelector("#island-stage");
const loader = document.querySelector("#scene-loader");
const motionToggle = document.querySelector("#motion-toggle");
const zoomInButton = document.querySelector("#zoom-in");
const zoomOutButton = document.querySelector("#zoom-out");

const palette = {
  ink: 0x21383a,
  magenta: 0xd00dad,
  lavender: 0xdec0de,
  mint: 0xc0ffee,
  leaf: 0xbada55,
  peach: 0xfacade,
  paper: 0xfffdf8,
  grass: 0x8fbe62,
  grassDark: 0x5f8f55,
  rock: 0x9b968b,
  rockDark: 0x77746e,
  wood: 0x8c624d,
  rail: 0x403c3b,
  water: 0x79dbe0,
  cream: 0xf4ead8,
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf2fbfb, 48, 95);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const defaultCameraPosition = new THREE.Vector3(...islandLayout.camera.position);
const defaultTarget = new THREE.Vector3(...islandLayout.camera.target);
camera.position.copy(defaultCameraPosition);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.target.copy(defaultTarget);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minDistance = 11;
controls.maxDistance = 68;
controls.minPolarAngle = 0.48;
controls.maxPolarAngle = 1.38;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.8;

const hemisphere = new THREE.HemisphereLight(0xf8ffff, 0x667457, 3.2);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xfff5e9, 4.8);
sun.position.set(-9, 16, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.00035;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0xcfefff, 1.2);
fillLight.position.set(12, 8, -10);
scene.add(fillLight);

function makeGrassTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = "#8fbe62";
  context.fillRect(0, 0, 256, 256);

  let seed = 4173;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let index = 0; index < 1500; index += 1) {
    const x = random() * 256;
    const y = random() * 256;
    const length = 1.2 + random() * 3.8;
    context.strokeStyle = random() > 0.48 ? "rgba(68, 126, 72, 0.30)" : "rgba(215, 239, 142, 0.28)";
    context.lineWidth = 0.55 + random() * 0.65;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 1.8, y - length);
    context.stroke();
  }

  for (let index = 0; index < 160; index += 1) {
    context.fillStyle = index % 3 === 0 ? "rgba(255, 239, 246, 0.45)" : "rgba(96, 151, 78, 0.30)";
    context.beginPath();
    context.arc(random() * 256, random() * 256, 0.6 + random(), 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 3.5);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const grassTexture = makeGrassTexture();

function makeBrickTexture(baseColor, brickColor, mortarColor) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = baseColor;
  context.fillRect(0, 0, 256, 256);

  const rowHeight = 28;
  const brickWidth = 54;
  for (let row = 0; row < 10; row += 1) {
    const y = row * rowHeight;
    const offset = row % 2 ? -brickWidth / 2 : 0;
    for (let column = -1; column < 6; column += 1) {
      const x = column * brickWidth + offset;
      context.fillStyle = brickColor;
      context.fillRect(x + 2, y + 2, brickWidth - 4, rowHeight - 4);
      context.fillStyle = "rgba(255,255,255,0.08)";
      context.fillRect(x + 4, y + 4, brickWidth - 8, 3);
    }
  }
  context.strokeStyle = mortarColor;
  context.lineWidth = 2;
  for (let row = 0; row <= 10; row += 1) {
    context.beginPath();
    context.moveTo(0, row * rowHeight);
    context.lineTo(256, row * rowHeight);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.6, 2.6);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeCobbleTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = "#a79d8d";
  context.fillRect(0, 0, 256, 256);

  let seed = 7319;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 12; column += 1) {
      const x = column * 23 + (row % 2) * 11 + (random() - 0.5) * 5;
      const y = row * 23 + (random() - 0.5) * 5;
      const radiusX = 8 + random() * 3;
      const radiusY = 6 + random() * 3;
      const tone = 122 + Math.floor(random() * 43);
      context.fillStyle = `rgb(${tone + 9}, ${tone + 5}, ${tone})`;
      context.strokeStyle = "rgba(71,62,54,0.78)";
      context.lineWidth = 2.2;
      context.beginPath();
      context.ellipse(x, y, radiusX, radiusY, random() * 0.6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 2.3);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const warmBrickTexture = makeBrickTexture("#9b4939", "#a95543", "rgba(238,215,188,0.75)");
const redBrickTexture = makeBrickTexture("#7f3d37", "#93483e", "rgba(228,205,183,0.72)");
const cobbleTexture = makeCobbleTexture();

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0xffffff, map: grassTexture, roughness: 0.92 }),
  grassDark: new THREE.MeshStandardMaterial({ color: palette.grassDark, roughness: 0.95 }),
  rock: new THREE.MeshStandardMaterial({ color: palette.rock, roughness: 1 }),
  rockDark: new THREE.MeshStandardMaterial({ color: palette.rockDark, roughness: 1 }),
  cream: new THREE.MeshStandardMaterial({ color: palette.cream, roughness: 0.82 }),
  paper: new THREE.MeshStandardMaterial({ color: palette.paper, roughness: 0.82 }),
  lavender: new THREE.MeshStandardMaterial({ color: palette.lavender, roughness: 0.78 }),
  magenta: new THREE.MeshStandardMaterial({ color: palette.magenta, roughness: 0.65 }),
  mint: new THREE.MeshStandardMaterial({ color: palette.mint, roughness: 0.72 }),
  leaf: new THREE.MeshStandardMaterial({ color: palette.leaf, roughness: 0.9 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x5d985d, roughness: 0.92 }),
  blossom: new THREE.MeshStandardMaterial({ color: 0xf3b7dd, roughness: 0.86 }),
  peach: new THREE.MeshStandardMaterial({ color: palette.peach, roughness: 0.85 }),
  wood: new THREE.MeshStandardMaterial({ color: palette.wood, roughness: 0.92 }),
  rail: new THREE.MeshStandardMaterial({ color: palette.rail, roughness: 0.48, metalness: 0.44 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x86d6dd,
    roughness: 0.25,
    metalness: 0.05,
    emissive: 0x164a50,
    emissiveIntensity: 0.25,
  }),
  dark: new THREE.MeshStandardMaterial({ color: palette.ink, roughness: 0.72 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xc9c1b3, roughness: 0.92 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.52, metalness: 0.2 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc98f72, roughness: 0.9 }),
  warmBrick: new THREE.MeshStandardMaterial({ color: 0xffffff, map: warmBrickTexture, roughness: 0.9 }),
  redBrick: new THREE.MeshStandardMaterial({ color: 0xffffff, map: redBrickTexture, roughness: 0.92 }),
  cobble: new THREE.MeshStandardMaterial({ color: 0xffffff, map: cobbleTexture, roughness: 1 }),
};

function setShadows(object, cast = true, receive = true) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
  return object;
}

function addBox(parent, size, position, material, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, position, material, segments = 20) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, position, material, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function createGableRoof(width, depth, height, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function makeIrregularCylinder(radiusTop, radiusBottom, height, segments, material) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const radius = Math.hypot(x, z);
    if (radius < 0.01) continue;
    const angle = Math.atan2(z, x);
    const wobble = 1 + Math.sin(angle * 5) * 0.025 + Math.cos(angle * 9) * 0.018;
    positions.setX(index, x * wobble);
    positions.setZ(index, z * wobble);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

const world = new THREE.Group();
scene.add(world);

function islandShape(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  return shape;
}

function insideCoast(x, z, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[j];
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

// One continuous lowland stream; the terrain below is cut to the same curve.
const riverCurve = new THREE.CatmullRomCurve3(
  islandLayout.river.map((p) => new THREE.Vector3(...p)), false, "centripetal",
);
const riverSamples = riverCurve.getSpacedPoints(220);
function riverNear(x, z) {
  let distance = Infinity;
  let nearest = riverSamples[0];
  riverSamples.forEach((p) => {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < distance) { distance = d; nearest = p; }
  });
  return { distance, level: nearest.y };
}
function groundHeight(x, z) {
  const { distance, level } = riverNear(x, z);
  const bank = THREE.MathUtils.smoothstep(distance, 0.39, 0.86);
  return THREE.MathUtils.lerp(level - 0.22, 1.0, bank);
}

function addCoastalRocks(points, stride = 5, scale = 1, channel = false) {
  for (let index = 0; index < points.length; index += stride) {
    const [x, z] = points[index];
    if (channel && riverNear(x, z).distance < 1.3) continue;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.26 * scale, 0),
      index % 3 === 0 ? materials.rockDark : materials.rock,
    );
    rock.position.set(x, -0.03, z);
    rock.scale.set(1.18, 0.9, 0.86);
    rock.rotation.set(index * 0.13, index * 0.37, index * 0.08);
    world.add(rock);
  }
}

function createIslandLandmass(points, { elevation = 1, channel = false, rocks = true } = {}) {
  const group = new THREE.Group();
  // Subdivide the coastline triangulation so the channel is a depression in the
  // actual surface, including an open river mouth through the coastal cliff.
  const flat = new THREE.ShapeGeometry(islandShape(points)).toNonIndexed();
  const vertices = [];
  const uvs = [];
  const height = (p) => channel ? groundHeight(p[0], p[1]) : elevation;
  function triangle(a, b, c) {
    const longest = Math.max(Math.hypot(a[0]-b[0], a[1]-b[1]), Math.hypot(b[0]-c[0], b[1]-c[1]), Math.hypot(c[0]-a[0], c[1]-a[1]));
    if (longest > 0.34) {
      const ab = [(a[0]+b[0])/2, (a[1]+b[1])/2];
      const bc = [(b[0]+c[0])/2, (b[1]+c[1])/2];
      const ca = [(c[0]+a[0])/2, (c[1]+a[1])/2];
      triangle(a,ab,ca); triangle(ab,b,bc); triangle(ca,bc,c); triangle(ab,bc,ca);
      return;
    }
    // Shape XY -> world XZ reverses the normal, so reverse the winding.
    [a,c,b].forEach((p) => { vertices.push(p[0],height(p),p[1]); uvs.push(p[0]*0.12,p[1]*0.12); });
  }
  const pos = flat.attributes.position;
  for (let i=0; i<pos.count; i+=3) triangle(
    [pos.getX(i),pos.getY(i)], [pos.getX(i+1),pos.getY(i+1)], [pos.getX(i+2),pos.getY(i+2)],
  );
  flat.dispose();
  const top = new THREE.BufferGeometry();
  top.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  top.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  top.computeVertexNormals();
  group.add(new THREE.Mesh(top,materials.grass));
  const sides = [];
  points.forEach((a,i) => {
    const b=points[(i+1)%points.length];
    const steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/0.22);
    for(let j=0;j<steps;j++) {
      const p=[THREE.MathUtils.lerp(a[0],b[0],j/steps),THREE.MathUtils.lerp(a[1],b[1],j/steps)];
      const q=[THREE.MathUtils.lerp(a[0],b[0],(j+1)/steps),THREE.MathUtils.lerp(a[1],b[1],(j+1)/steps)];
      sides.push(p[0],height(p),p[1],q[0],height(q),q[1],p[0],-0.88,p[1],
        q[0],height(q),q[1],q[0],-0.88,q[1],p[0],-0.88,p[1]);
    }
  });
  const edge = new THREE.BufferGeometry();
  edge.setAttribute("position",new THREE.Float32BufferAttribute(sides,3));
  edge.computeVertexNormals();
  const cliffMaterial = materials.rockDark.clone();
  cliffMaterial.side = THREE.DoubleSide;
  group.add(new THREE.Mesh(edge,cliffMaterial));
  setShadows(group);
  world.add(group);
  if(rocks) addCoastalRocks(points,5,1,channel);
  return group;
}

createIslandLandmass(coastlines.viti, { channel: true });
createIslandLandmass(coastlines.vanua);
createIslandLandmass(coastlines.taveuni);
coastlines.islets.forEach((outline) => createIslandLandmass(outline, { elevation: -0.36, rocks: false }));

function createHill(x, z, scaleX, scaleY, scaleZ) {
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.grass,
  );
  hill.position.set(x, 0.98, z);
  hill.scale.set(scaleX, scaleY, scaleZ);
  hill.castShadow = true;
  hill.receiveShadow = true;
  world.add(hill);
  return hill;
}

createHill(-4.35, 2.05, 1.28, 0.88, 1.05);
createHill(4.4, 1.5, 0.8, 0.5, 0.7);
createHill(9.3, -11.1, 1.35, 0.85, 0.75);
createHill(13.2, -12.7, 1.65, 1.05, 0.72);
createHill(19.5, -9.2, 0.6, 0.9, 0.75);

const cliff = new THREE.Group();
cliff.position.set(-6.1, -0.15, 1.85);
cliff.scale.set(0.5, 0.7, 0.6);
[
  [0.0, 0.18, -1.35, 0.82, 1.75, 0.9],
  [0.35, 0.08, -0.55, 0.95, 1.9, 1.05],
  [0.45, 0.12, 0.35, 1.02, 1.82, 1.05],
  [0.15, 0.2, 1.25, 0.84, 1.65, 0.92],
  [-0.45, 0.05, -0.05, 0.72, 1.45, 0.88],
].forEach(([x, y, z, sx, sy, sz], index) => {
  const face = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.78, 0),
    index % 2 ? materials.rock : materials.rockDark,
  );
  face.position.set(x, y, z);
  face.scale.set(sx, sy, sz);
  face.rotation.set(0.08 * index, -0.18 + index * 0.12, 0.05 * index);
  face.castShadow = true;
  face.receiveShadow = true;
  cliff.add(face);
});
const cliffLip = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 3.35), materials.grass);
cliffLip.position.set(-0.25, 1.0, 0);
cliffLip.rotation.z = -0.04;
cliffLip.castShadow = true;
cliffLip.receiveShadow = true;
cliff.add(cliffLip);
world.add(cliff);

const tuftPositions = [];
let tuftSeed = 9187;
const tuftRandom = () => {
  tuftSeed = (tuftSeed * 1103515245 + 12345) % 2147483648;
  return tuftSeed / 2147483648;
};
for (let attempt = 0; attempt < 700 && tuftPositions.length < 150; attempt += 1) {
  const radius = Math.sqrt(tuftRandom()) * 6.85;
  const angle = tuftRandom() * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const blocked = [
    [-3.4, -0.8, 1.55],
    [-0.7, -3.4, 1.25],
    [3.25, -0.45, 2.0],
    [2.8, 3.35, 1.8],
    [-0.4, 4.15, 1.9],
  ].some(([bx, bz, distance]) => Math.hypot(x - bx, z - bz) < distance);
  if (!blocked && insideCoast(x, z, coastlines.viti) && riverNear(x, z).distance > 1.0) tuftPositions.push([x, z, tuftRandom()]);
}

const tuftGeometry = new THREE.ConeGeometry(0.035, 0.16, 3);
const grassTufts = new THREE.InstancedMesh(tuftGeometry, materials.grassDark, tuftPositions.length);
const tuftMatrix = new THREE.Matrix4();
const tuftQuaternion = new THREE.Quaternion();
const tuftScale = new THREE.Vector3();
tuftPositions.forEach(([x, z, variation], index) => {
  tuftQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), variation * Math.PI * 2);
  tuftScale.setScalar(0.72 + variation * 0.7);
  tuftMatrix.compose(new THREE.Vector3(x, 1.09, z), tuftQuaternion, tuftScale);
  grassTufts.setMatrixAt(index, tuftMatrix);
});
grassTufts.castShadow = true;
world.add(grassTufts);

const waterUniforms = { time: { value: 0 } };
const waterMaterial = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  transparent: true,
  depthWrite: false,
  vertexShader: `
    uniform float time;
    varying vec2 vPosition;
    varying float vWave;
    void main() {
      vec3 p = position;
      float waveA = sin(p.x * 0.52 + time * 0.85) * 0.10;
      float waveB = cos(p.y * 0.63 - time * 0.68) * 0.07;
      p.z += waveA + waveB;
      vPosition = p.xy;
      vWave = waveA + waveB;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    varying vec2 vPosition;
    varying float vWave;
    void main() {
      float ribbon = 0.5 + 0.5 * sin((vPosition.x + vPosition.y) * 1.35 - time * 1.25);
      float shimmer = smoothstep(0.68, 0.98, ribbon) * 0.17;
      vec3 deepWater = vec3(0.34, 0.77, 0.80);
      vec3 paleWater = vec3(0.76, 0.96, 0.95);
      vec3 color = mix(deepWater, paleWater, 0.48 + vWave * 1.6 + shimmer);
      float edgeFade = 1.0 - smoothstep(20.0, 48.0, length(vPosition));
      gl_FragColor = vec4(color, 0.78 * edgeFade);
    }
  `,
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 96, 96), waterMaterial);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.72;
water.renderOrder = -1;
scene.add(water);

const riverUniforms = { time: { value: 0 } };
const riverMaterial = new THREE.ShaderMaterial({
  uniforms: riverUniforms,
  transparent: true,
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    varying vec2 vUv;
    void main() {
      float flow = 0.5 + 0.5 * sin(vUv.x * 65.0 - time * 5.2 + sin(vUv.y * 9.0));
      float foam = smoothstep(0.78, 1.0, flow);
      vec3 waterColor = mix(vec3(0.23, 0.68, 0.74), vec3(0.79, 0.98, 0.96), 0.42 + foam * 0.42);
      float mouthFade = 1.0 - smoothstep(0.86, 1.0, vUv.x);
      gl_FragColor = vec4(waterColor, 0.96 * mouthFade);
    }
  `,
});

function createRibbonGeometry(curve, segments, halfWidth) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const width = typeof halfWidth === "function" ? halfWidth(t) : halfWidth;
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width);
    const left = point.clone().add(side);
    const right = point.clone().sub(side);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(t, 0, t, 1);
    if (index < segments) {
      const base = index * 2;
      indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const river = new THREE.Mesh(
  createRibbonGeometry(riverCurve, 180, (t) => 0.35 + Math.max(0, t - 0.75) * 1.3),
  riverMaterial,
);
river.receiveShadow = true;
world.add(river);

function addPath(points, radius = 0.13) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 1.035, z)),
    false,
    "centripetal",
  );
  const path = new THREE.Mesh(
    createRibbonGeometry(curve, 64, radius * 1.7),
    materials.cobble,
  );
  path.receiveShadow = true;
  world.add(path);
}

islandLayout.paths.forEach(({ points, width }) => addPath(points, width));

// Straight tangents at the tunnel and bridge keep the vehicles inside their openings.
const trackPath = new THREE.CurvePath();
islandLayout.railway.forEach((points) => {
  const vectors = points.map((point) => new THREE.Vector3(...point));
  trackPath.add(points.length === 2
    ? new THREE.LineCurve3(...vectors)
    : new THREE.CubicBezierCurve3(...vectors));
});
const trackCurve = trackPath;

// Tapered earth approaches support the gentle climb onto the bridge.
const approachVertices = [];
for (let i=0;i<300;i++) {
  const a=trackCurve.getPointAt(i/300),b=trackCurve.getPointAt((i+1)/300);
  const middle=a.clone().add(b).multiplyScalar(0.5);
  if (middle.y<1.25 || (middle.x>=-0.65 && middle.x<=3.45 && Math.abs(middle.z-2.6)<0.6)) continue;
  const side=new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize();
  const ring=(p)=>[-1,1].map(sign=>({
    top:p.clone().addScaledVector(side,sign*0.36).add(new THREE.Vector3(0,-0.13,0)),
    foot:new THREE.Vector3(p.x,1.0,p.z).addScaledVector(side,sign*(0.46+(p.y-1.18)*0.4)),
  }));
  const r=ring(a),q=ring(b);
  const tri=(a,b,c)=>approachVertices.push(...a.toArray(),...b.toArray(),...c.toArray());
  tri(r[0].top,q[0].top,r[1].top); tri(q[0].top,q[1].top,r[1].top);
  for(let sideIndex=0;sideIndex<2;sideIndex++) {
    tri(r[sideIndex].top,r[sideIndex].foot,q[sideIndex].top);
    tri(r[sideIndex].foot,q[sideIndex].foot,q[sideIndex].top);
  }
}
const approachGeometry=new THREE.BufferGeometry();
approachGeometry.setAttribute('position',new THREE.Float32BufferAttribute(approachVertices,3));
approachGeometry.computeVertexNormals();
const approachMaterial=materials.rock.clone();
approachMaterial.side=THREE.DoubleSide;
const approaches=new THREE.Mesh(approachGeometry,approachMaterial);
approaches.receiveShadow=true;
world.add(approaches);

function offsetCurve(source, amount, samples = 180) {
  const points = [];
  for (let index = 0; index < samples; index += 1) {
    const t = index / samples;
    const point = source.getPointAt(t);
    const tangent = source.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    points.push(point.addScaledVector(normal, amount));
  }
  return new THREE.CatmullRomCurve3(points, true, "centripetal");
}

const leftRail = new THREE.Mesh(
  new THREE.TubeGeometry(offsetCurve(trackCurve, -0.16), 220, 0.035, 7, true),
  materials.rail,
);
const rightRail = new THREE.Mesh(
  new THREE.TubeGeometry(offsetCurve(trackCurve, 0.16), 220, 0.035, 7, true),
  materials.rail,
);
leftRail.castShadow = true;
rightRail.castShadow = true;
world.add(leftRail, rightRail);

const sleeperGeometry = new THREE.BoxGeometry(0.62, 0.075, 0.12);
const sleeperCount = 96;
const sleepers = new THREE.InstancedMesh(sleeperGeometry, materials.wood, sleeperCount);
const sleeperMatrix = new THREE.Matrix4();
const sleeperQuaternion = new THREE.Quaternion();
const sleeperScale = new THREE.Vector3(1, 1, 1);
const xAxis = new THREE.Vector3(1, 0, 0);
for (let index = 0; index < sleeperCount; index += 1) {
  const t = index / sleeperCount;
  const point = trackCurve.getPointAt(t);
  point.y -= 0.07;
  const tangent = trackCurve.getTangentAt(t).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  sleeperQuaternion.setFromUnitVectors(xAxis, normal);
  sleeperMatrix.compose(point, sleeperQuaternion, sleeperScale);
  sleepers.setMatrixAt(index, sleeperMatrix);
}
sleepers.castShadow = true;
sleepers.receiveShadow = true;
world.add(sleepers);

function archProfile(radius, thickness, base, spring) {
  const shape = new THREE.Shape();
  shape.moveTo(-radius-thickness,base);
  shape.lineTo(-radius-thickness,spring);
  shape.absarc(0,spring,radius+thickness,Math.PI,0,true);
  shape.lineTo(radius+thickness,base);
  shape.lineTo(radius,base);
  shape.lineTo(radius,spring);
  shape.absarc(0,spring,radius,0,Math.PI,false);
  shape.lineTo(-radius,base);
  shape.closePath();
  return shape;
}

function createMountain() {
  const mountain = new THREE.Group();
  mountain.position.set(...islandLayout.landmarks.mountain);
  mountain.rotation.y = Math.PI/2;
  // The opening is part of the mountain's cross-section. No rock or dark disc
  // spans the bore: rails and carriages remain visible through both ends.
  const section = new THREE.Shape();
  section.moveTo(1.72,1.0);
  section.lineTo(1.72,2.0);
  section.lineTo(1.1,3.1);
  section.lineTo(0.28,4.8);
  section.lineTo(-0.2,4.4);
  section.lineTo(-0.65,3.55);
  section.lineTo(-1.5,2.65);
  section.lineTo(-1.8,1.0);
  section.lineTo(-0.76,1.0);
  section.lineTo(-0.76,1.75);
  section.absarc(0,1.75,0.76,Math.PI,0,true);
  section.lineTo(0.76,1.0);
  section.closePath();
  const geo = new THREE.ExtrudeGeometry(section,{depth:3.4,steps:8,bevelEnabled:false,curveSegments:20});
  geo.translate(0,0,-1.7);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++) {
    const y=p.getY(i),z=p.getZ(i);
    if(y>2.6) p.setY(i,2.6+(y-2.6)*(1-0.35*Math.abs(z)/1.7));
  }
  geo.computeVertexNormals();
  const ridge=new THREE.Mesh(geo,materials.rockDark);
  mountain.add(ridge);
  // A thin vaulted lining makes the inside legible as a continuous tunnel.
  const lining=new THREE.Mesh(
    new THREE.ExtrudeGeometry(archProfile(0.72,0.045,1.0,1.75),{depth:3.8,bevelEnabled:false,curveSegments:24}),
    new THREE.MeshStandardMaterial({color:0x3b4540,roughness:1,side:THREE.DoubleSide}),
  );
  lining.position.z=-1.9;
  mountain.add(lining);
  [-1.92,1.92].forEach((z)=>{
    const portal=new THREE.Mesh(
      new THREE.ExtrudeGeometry(archProfile(0.73,0.23,1.0,1.75),{depth:0.24,bevelEnabled:false,curveSegments:24}),
      materials.warmBrick,
    );
    portal.position.z=z-0.12;
    mountain.add(portal);
    // Individual pale voussoirs outline the unobstructed arch.
    for(let i=0;i<=12;i++) {
      const angle=i/12*Math.PI;
      const stone=addBox(mountain,[0.18,0.24,0.29],
        [Math.cos(angle)*0.855,1.75+Math.sin(angle)*0.855,z],materials.concrete);
      stone.rotation.z=angle-Math.PI/2;
    }
    [-1,1].forEach(sign=>{
      addBox(mountain,[0.32,0.6,0.42],[sign*1.1,1.3,z],materials.rock);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.075,10,8),
        new THREE.MeshStandardMaterial({color:0xffe7a5,emissive:0xffcb65,emissiveIntensity:1.2}));
      lamp.position.set(sign*1.05,1.94,z+(z>0?0.22:-0.22));
      mountain.add(lamp);
    });
  });
  setShadows(mountain);
  world.add(mountain);
  return mountain;
}
const mountain = createMountain();

function createRailBridge() {
  const bridge = new THREE.Group();
  bridge.position.set(...islandLayout.landmarks.bridge);
  // A full-width extruded masonry arch, with a genuinely empty span below it.
  const face = new THREE.Shape();
  face.moveTo(-2,0.15); face.lineTo(-2,1.96); face.lineTo(2,1.96);
  face.lineTo(2,0.15); face.lineTo(1.46,0.15); face.lineTo(1.46,0.48);
  face.absellipse(0,0.48,1.46,1.2,0,Math.PI,false);
  face.lineTo(-1.46,0.15); face.closePath();
  const geometry=new THREE.ExtrudeGeometry(face,{depth:1.1,bevelEnabled:false,curveSegments:28});
  geometry.translate(0,0,-0.55);
  bridge.add(new THREE.Mesh(geometry,materials.warmBrick));
  [-0.58,0.58].forEach(z=>{
    for(let i=0;i<19;i++) {
      const angle=(i+0.5)/19*Math.PI;
      const stone=addBox(bridge,[0.22,0.18,0.14],
        [1.48*Math.cos(angle),0.48+1.23*Math.sin(angle),z],materials.concrete);
      stone.rotation.z=Math.atan2(1.23*Math.cos(angle),-1.48*Math.sin(angle));
    }
    addBox(bridge,[4.18,0.12,0.19],[0,2.02,z],materials.concrete);
    for(let i=0;i<9;i++) addBox(bridge,[0.06,0.34,0.06],[-1.92+i*0.48,2.25,z],materials.rail);
    addBox(bridge,[4.08,0.055,0.055],[0,2.42,z],materials.magenta);
  });
  setShadows(bridge);
  world.add(bridge);
  return bridge;
}
const railBridge = createRailBridge();

function addWheel(parent, x, z, wheelStore) {
  const pivot = new THREE.Group();
  pivot.position.set(x, -0.28, z);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16), materials.dark);
  wheel.rotation.z = Math.PI / 2;
  pivot.add(wheel);
  parent.add(pivot);
  wheelStore.push(pivot);
}

function createEngine(wheelStore) {
  const engine = new THREE.Group();
  addBox(engine, [0.82, 0.22, 1.15], [0, 0, 0], materials.dark);
  addBox(engine, [0.72, 0.48, 0.53], [0, 0.34, -0.28], materials.magenta);
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.62, 18), materials.magenta);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(0, 0.24, 0.27);
  engine.add(boiler);
  addCylinder(engine, 0.1, 0.15, 0.35, [0, 0.63, 0.34], materials.dark, 14);
  addBox(engine, [0.38, 0.21, 0.05], [0, 0.34, 0.6], materials.mint);
  addBox(engine, [0.12, 0.08, 0.18], [0.47, -0.04, 0.56], materials.gold);
  addBox(engine, [0.12, 0.08, 0.18], [-0.47, -0.04, 0.56], materials.gold);
  [-0.34, 0.34].forEach((x) => {
    [-0.34, 0.34].forEach((z) => addWheel(engine, x, z, wheelStore));
  });
  return setShadows(engine);
}

function createCarriage(wheelStore, colorMaterial = materials.magenta) {
  const carriage = new THREE.Group();
  addBox(carriage, [0.86, 0.22, 1.15], [0, 0, 0], materials.dark);
  addBox(carriage, [0.78, 0.52, 1.04], [0, 0.36, 0], colorMaterial);
  addBox(carriage, [0.84, 0.12, 1.1], [0, 0.67, 0], materials.lavender);
  [-0.35, 0, 0.35].forEach((z) => {
    addBox(carriage, [0.8, 0.2, 0.16], [0, 0.41, z], materials.cream);
    addBox(carriage, [0.82, 0.13, 0.09], [0, 0.41, z], materials.glass);
  });
  [-0.34, 0.34].forEach((x) => {
    [-0.34, 0.34].forEach((z) => addWheel(carriage, x, z, wheelStore));
  });
  return setShadows(carriage);
}

const trainWheels = [];
const trainCars = [
  createEngine(trainWheels),
  createCarriage(trainWheels),
  createCarriage(trainWheels, materials.lavender),
];
trainCars.forEach((car) => world.add(car));

function placeTrainCar(car, t) {
  const wrapped = ((t % 1) + 1) % 1;
  const point = trackCurve.getPointAt(wrapped);
  const tangent = trackCurve.getTangentAt(wrapped).normalize();
  car.position.copy(point);
  car.position.y += 0.28;
  car.rotation.set(-Math.asin(tangent.y), Math.atan2(tangent.x, tangent.z), 0, "YXZ");
}

function makeWindow(parent, position, size = [0.32, 0.42, 0.05]) {
  return addBox(parent, size, position, materials.glass);
}

function createLibrary() {
  const building = new THREE.Group();

  addBox(building, [2.0, 0.18, 1.85], [0, 0.05, 0], materials.concrete);
  addBox(building, [1.86, 0.38, 1.68], [0, 0.28, 0], materials.rock);
  addBox(building, [1.72, 1.55, 1.55], [0, 0.92, 0], materials.cream);
  const roof = createGableRoof(2.15, 1.9, 0.72, materials.lavender);
  roof.position.y = 1.7;
  building.add(roof);
  addBox(building, [0.44, 0.82, 0.07], [0, 0.5, 0.81], materials.wood);
  [-0.72, 0, 0.72].forEach((x) => {
    addBox(building, [0.09, 1.34, 0.075], [x, 1.05, 0.805], materials.wood);
  });
  [0.65, 1.34].forEach((y) => {
    addBox(building, [1.68, 0.09, 0.075], [0, y, 0.805], materials.wood);
  });
  addBox(building, [0.07, 0.83, 0.08], [-0.36, 1.04, 0.82], materials.wood, [0, 0, 0.68]);
  addBox(building, [0.07, 0.83, 0.08], [0.36, 1.04, 0.82], materials.wood, [0, 0, -0.68]);
  makeWindow(building, [-0.52, 1.02, 0.81]);
  makeWindow(building, [0.52, 1.02, 0.81]);
  makeWindow(building, [-0.52, 1.02, -0.81]);
  makeWindow(building, [0.52, 1.02, -0.81]);
  [-0.52, 0.52].forEach((x) => {
    addBox(building, [0.08, 0.5, 0.34], [x < 0 ? -0.88 : 0.88, 1.0, x], materials.glass);
  });
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 20), materials.magenta);
  seal.rotation.x = Math.PI / 2;
  seal.position.set(0.55, 1.48, 0.83);
  building.add(seal);
  addBox(building, [0.68, 0.12, 0.22], [-0.52, 0.72, 0.88], materials.wood);
  addBox(building, [0.68, 0.12, 0.22], [0.52, 0.72, 0.88], materials.wood);
  [-0.78, -0.55, -0.32, 0.32, 0.55, 0.78].forEach((x, index) => {
    addSphere(building, 0.06, [x, 0.82, 0.94], index % 2 ? materials.blossom : materials.leaf);
  });
  addCylinder(building, 0.14, 0.17, 0.95, [0.62, 2.25, -0.15], materials.redBrick, 12);
  addCylinder(building, 0.2, 0.2, 0.1, [0.62, 2.75, -0.15], materials.dark, 12);
  setShadows(building);
  return building;
}

function createObservatory() {
  const building = new THREE.Group();

  addCylinder(building, 0.92, 1.0, 1.8, [0, 0.95, 0], materials.redBrick, 24);
  addCylinder(building, 1.01, 1.04, 0.2, [0, 0.13, 0], materials.concrete, 24);
  addCylinder(building, 0.98, 0.98, 0.12, [0, 1.75, 0], materials.gold, 24);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.93, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.lavender,
  );
  dome.position.y = 1.85;
  building.add(dome);
  addBox(building, [0.42, 0.8, 0.06], [0, 0.45, 0.94], materials.wood);
  const roundWindow = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 20), materials.glass);
  roundWindow.rotation.x = Math.PI / 2;
  roundWindow.position.set(0, 1.25, 0.94);
  building.add(roundWindow);
  const telescope = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.1, 14), materials.gold);
  tube.rotation.z = Math.PI / 2;
  telescope.add(tube);
  addCylinder(telescope, 0.08, 0.08, 0.75, [0, -0.42, 0], materials.dark, 10);
  telescope.position.set(0.35, 2.65, 0);
  telescope.rotation.z = -0.35;
  building.add(telescope);
  addCylinder(building, 0.45, 0.45, 0.08, [1.05, 0.13, 0.15], materials.dark, 24);
  addBox(building, [0.75, 0.08, 0.18], [1.05, 0.23, 0.15], materials.wood, [0, 0.5, 0]);
  setShadows(building);
  return building;
}

function createFactory() {
  const building = new THREE.Group();

  addBox(building, [3.2, 0.18, 2.05], [0, 0.05, 0], materials.concrete);
  addBox(building, [2.7, 1.25, 1.7], [0, 0.72, 0], materials.warmBrick);
  [-0.88, 0, 0.88].forEach((x) => {
    const roof = createGableRoof(1.04, 1.82, 0.48, materials.lavender);
    roof.position.set(x, 1.34, 0);
    building.add(roof);
  });
  addBox(building, [0.75, 0.72, 0.06], [-0.62, 0.48, 0.87], materials.dark);
  [-0.2, 0.52, 1.0].forEach((x) => makeWindow(building, [x, 0.83, 0.88], [0.38, 0.42, 0.07]));
  addCylinder(building, 0.23, 0.3, 2.25, [1.18, 1.55, -0.55], materials.redBrick, 18);
  addCylinder(building, 0.32, 0.32, 0.13, [1.18, 2.72, -0.55], materials.dark, 18);
  addCylinder(building, 0.14, 0.18, 1.2, [-1.08, 1.25, -0.5], materials.mint, 16);
  const conveyor = addBox(building, [2.0, 0.16, 0.55], [1.25, 0.25, 1.35], materials.dark, [0, -0.24, 0]);
  conveyor.castShadow = true;
  for (let index = 0; index < 4; index += 1) {
    addBox(building, [0.33, 0.33, 0.33], [0.52 + index * 0.42, 0.48, 1.19 - index * 0.1], materials.peach);
  }
  setShadows(building);
  return building;
}

function markProject(group, key) {
  group.userData.project = key;
  group.traverse((child) => {
    child.userData.project = key;
  });
  return group;
}

const buildingFactories = {
  library: createLibrary,
  observatory: createObservatory,
  factory: createFactory,
  station: createStation,
  cottages: (site) => createTownMarker(0, 0, site.accent),
};
const projectObjects = Object.fromEntries(
  Object.entries(islandLayout.sites).flatMap(([key, site]) => {
    if (site.model === "sign") return [];
    const building = markProject(buildingFactories[site.model](site), key);
    building.position.set(...site.position);
    building.rotation.y = site.rotation || 0;
    world.add(building);
    return [[key, building]];
  }),
);

function createStation() {
  const station = new THREE.Group();
  addBox(station, [3.1, 0.18, 0.9], [0, 0.05, 0], materials.concrete);
  addBox(station, [1.25, 0.85, 0.72], [-0.65, 0.52, 0], materials.mint);
  const roof = createGableRoof(1.5, 0.92, 0.42, materials.lavender);
  roof.position.set(-0.65, 0.95, 0);
  station.add(roof);
  [-1.2, -0.65, -0.1].forEach((x) => addBox(station, [0.07, 0.76, 0.05], [x, 0.55, 0.38], materials.wood));
  addBox(station, [1.2, 0.07, 0.05], [-0.65, 0.72, 0.38], materials.wood);
  addBox(station, [1.65, 0.1, 0.86], [0.92, 1.05, 0], materials.lavender);
  [0.25, 0.92, 1.58].forEach((x) => addCylinder(station, 0.05, 0.05, 1.0, [x, 0.54, 0], materials.wood, 10));
  makeWindow(station, [-0.85, 0.57, 0.38], [0.28, 0.3, 0.05]);
  addBox(station, [0.36, 0.58, 0.06], [-0.38, 0.34, 0.38], materials.wood);
  addCylinder(station, 0.1, 0.12, 0.62, [-1.02, 1.18, -0.12], materials.redBrick, 10);
  return setShadows(station);
}

function createTownMarker(x, z, accent, rotation = 0) {
  const town = new THREE.Group();
  town.position.set(x, 1.0, z);
  town.rotation.y = rotation;
  const wallMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.86 });

  [
    [-0.48, 0, 0.72, 0.72, 0.68],
    [0.4, 0.08, 0.62, 0.88, 0.58],
    [0.02, -0.56, 0.7, 0.6, 0.52],
  ].forEach(([bx, bz, width, height, depth], index) => {
    addBox(town, [width, height, depth], [bx, height / 2, bz], index === 1 ? materials.warmBrick : wallMaterial);
    const roof = createGableRoof(width + 0.14, depth + 0.12, 0.28, index === 1 ? materials.lavender : materials.paper);
    roof.position.set(bx, height, bz);
    town.add(roof);
    makeWindow(town, [bx, height * 0.55, bz + depth / 2 + 0.015], [0.18, 0.2, 0.035]);
  });

  addCylinder(town, 0.035, 0.045, 1.35, [0.82, 0.68, 0.38], materials.wood, 9);
  const flag = addBox(town, [0.42, 0.24, 0.025], [1.02, 1.16, 0.38], materials.magenta);
  flag.rotation.z = -0.04;
  return setShadows(town);
}

function createConstructionSite() {
  const site = new THREE.Group();
  site.position.set(...islandLayout.landmarks.construction);
  addBox(site, [2.4, 0.18, 1.9], [0, 0.05, 0], materials.concrete);
  [[-0.85, -0.62], [0.85, -0.62], [-0.85, 0.62], [0.85, 0.62]].forEach(([x, z]) => {
    addCylinder(site, 0.09, 0.12, 1.35, [x, 0.75, z], materials.concrete, 12);
  });
  addBox(site, [1.9, 0.12, 0.12], [0, 1.37, -0.62], materials.wood);
  addBox(site, [1.9, 0.12, 0.12], [0, 1.37, 0.62], materials.wood);
  const crane = new THREE.Group();
  addBox(crane, [0.16, 2.6, 0.16], [0, 1.3, 0], materials.gold);
  addBox(crane, [2.55, 0.14, 0.14], [1.08, 2.56, 0], materials.gold);
  addBox(crane, [0.05, 1.0, 0.05], [1.72, 2.06, 0], materials.dark);
  addBox(crane, [0.28, 0.25, 0.28], [1.72, 1.54, 0], materials.magenta);
  crane.position.set(-0.95, 0, -0.85);
  crane.rotation.y = -0.4;
  site.add(crane);
  site.userData.crane = crane;
  return setShadows(site);
}

const constructionSite = createConstructionSite();
world.add(constructionSite);

function createScaffold() {
  const site = new THREE.Group();
  site.position.set(...islandLayout.landmarks.scaffolding);
  addBox(site, [1.8, 1.2, 1.5], [0, 0.68, 0], materials.concrete);
  [-1, 1].forEach((xSign) => {
    [-1, 1].forEach((zSign) => {
      addCylinder(site, 0.035, 0.035, 2.0, [xSign * 1.0, 1.0, zSign * 0.85], materials.wood, 8);
    });
  });
  [0.35, 1.1, 1.82].forEach((y) => {
    addBox(site, [2.1, 0.06, 0.06], [0, y, 0.85], materials.wood);
    addBox(site, [2.1, 0.06, 0.06], [0, y, -0.85], materials.wood);
  });
  const tarp = addBox(site, [1.95, 1.65, 0.04], [0, 1.1, 0.9], materials.paper, [0.04, 0, -0.04]);
  tarp.material = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 1, side: THREE.DoubleSide });
  return setShadows(site);
}
world.add(createScaffold());

function createDockAndBoat() {
  const dock = new THREE.Group();
  dock.position.set(...islandLayout.landmarks.dock);
  dock.rotation.y = islandLayout.landmarks.dockRotation;
  for (let index = 0; index < 11; index += 1) {
    addBox(dock, [1.2, 0.12, 0.24], [0, 0, -1.2 + index * 0.25], materials.wood);
  }
  [-0.5, 0.5].forEach((x) => {
    [-1.15, -0.35, 0.45, 1.25].forEach((z) => {
      addCylinder(dock, 0.055, 0.07, 1.15, [x, -0.48, z], materials.wood, 10);
    });
    addBox(dock, [0.06, 0.06, 2.7], [x, 0.22, 0.05], materials.wood);
  });
  [0, 1, 2, 3].forEach((step) => {
    addBox(
      dock,
      [1.18, 0.12, 0.32],
      [0, 0.18 + step * 0.17, -1.52 - step * 0.28],
      materials.wood,
      [-0.18, 0, 0],
    );
  });
  setShadows(dock);
  world.add(dock);

  const boat = new THREE.Group();
  boat.position.set(6.55, -0.48, 5.0);
  boat.rotation.y = 1.12;
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), materials.magenta);
  hull.scale.set(0.46, 0.22, 1.05);
  hull.position.y = 0.02;
  boat.add(hull);
  addBox(boat, [0.62, 0.12, 1.15], [0, 0.15, 0], materials.cream);
  addCylinder(boat, 0.035, 0.045, 1.45, [0, 0.82, 0], materials.wood, 10);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 1.18);
  sailShape.lineTo(0.82, 0.18);
  sailShape.closePath();
  const sail = new THREE.Mesh(
    new THREE.ExtrudeGeometry(sailShape, { depth: 0.025, bevelEnabled: false }),
    materials.paper,
  );
  sail.position.set(0.04, 0.35, 0);
  sail.rotation.y = Math.PI / 2;
  boat.add(sail);
  addSphere(boat, 0.09, [0, 0.34, -0.66], materials.gold);
  setShadows(boat);
  world.add(boat);

  return { dock, boat };
}

const harbor = createDockAndBoat();

// The boat waits at its berth between complete coastal trips.
const sailingRoute = new THREE.CatmullRomCurve3(
  islandLayout.sailing.map(([x,z]) => new THREE.Vector3(x,-0.48,z)), true, "centripetal",
);

function createAeroplane() {
  const plane = new THREE.Group();
  addSphere(plane,1,[0,0,0],materials.paper,[0.25,0.25,1.02]);
  addSphere(plane,1,[0,0.01,0.79],materials.magenta,[0.24,0.23,0.32]);
  addSphere(plane,1,[0,0.19,0.26],materials.glass,[0.2,0.18,0.32]);
  addBox(plane,[2.65,0.095,0.48],[0,0.02,0.08],materials.lavender);
  [-1,1].forEach(sign=>{
    addBox(plane,[0.28,0.11,0.48],[sign*1.24,0.06,0.08],materials.magenta,[0,0,sign*0.15]);
    addBox(plane,[0.12,0.18,0.32],[sign*0.36,-0.29,0.22],materials.dark);
  });
  addBox(plane,[1.0,0.065,0.32],[0,0.07,-0.72],materials.mint);
  addBox(plane,[0.07,0.47,0.42],[0,0.25,-0.72],materials.magenta,[0.15,0,0]);
  const propeller = new THREE.Group();
  propeller.position.set(0,0,1.11);
  addBox(propeller,[0.065,0.85,0.05],[0,0,0],materials.wood);
  addSphere(propeller,0.085,[0,0,0.05],materials.gold);
  plane.add(propeller);
  plane.rotation.order="YXZ";
  setShadows(plane);
  world.add(plane);
  return { plane, propeller };
}
const aeroplane = createAeroplane();
const flightRoute = new THREE.CatmullRomCurve3(
  islandLayout.flight.map(p => new THREE.Vector3(...p)), true, "centripetal",
);

function updateJourneys(time) {
  const flight = (time / 34) % 1;
  const heading = flightRoute.getTangentAt(flight).normalize();
  const nextHeading = flightRoute.getTangentAt((flight+0.007)%1).normalize();
  aeroplane.plane.position.copy(flightRoute.getPointAt(flight));
  const turn = heading.z*nextHeading.x-heading.x*nextHeading.z;
  aeroplane.plane.rotation.set(-Math.asin(heading.y),Math.atan2(heading.x,heading.z),THREE.MathUtils.clamp(-turn*5,-0.38,0.38),"YXZ");
  aeroplane.propeller.rotation.z=time*35;

  const cycle=time%104;
  const underway=cycle>=14 && cycle<90;
  const progress=THREE.MathUtils.clamp((cycle-14)/76,0,1);
  const eased=progress-Math.sin(progress*Math.PI*2)/(Math.PI*2);
  const boatT=underway?eased:0;
  const direction=sailingRoute.getTangentAt(boatT);
  harbor.boat.position.copy(sailingRoute.getPointAt(boatT));
  harbor.boat.position.y=-0.48+Math.sin(time*1.15)*0.045;
  harbor.boat.rotation.set(0,Math.atan2(direction.x,direction.z),Math.sin(time*0.78)*0.035);
}

function createTree(x, z, scale = 1, blossom = false) {
  const tree = new THREE.Group();
  addCylinder(tree, 0.08 * scale, 0.11 * scale, 0.78 * scale, [0, 0.38 * scale, 0], materials.wood, 10);
  addSphere(
    tree,
    0.47 * scale,
    [0, 0.95 * scale, 0],
    blossom ? materials.blossom : materials.leafDark,
    [1, 1.2, 1],
  );
  addSphere(
    tree,
    0.36 * scale,
    [0.25 * scale, 1.1 * scale, 0],
    blossom ? materials.blossom : materials.leaf,
  );
  tree.position.set(x, 1.0, z);
  return setShadows(tree);
}

[
  [-5.3, 1.3, 0.8, true], [-4.6, 2.2, 0.7, false],
  [-5.0, 0.4, 0.65, false], [-4.2, 2.5, 0.65, true],
  [0.4, -3.2, 0.65, true], [3.5, -3.0, 0.6, false],
  [5.0, 0.3, 0.6, false], [3.8, 1.6, 0.75, true],
  [0.1, 3.9, 0.65, false], [-3.9, 2.3, 0.7, false],
  [9.0, -11.3, 0.7, false], [10.5, -11.6, 0.8, true],
  [13.8, -12.7, 0.75, false], [15.8, -13.8, 0.7, false],
  [17.9, -15.3, 0.6, false], [19.2, -8.8, 0.55, true],
  [19.8, -10.1, 0.6, false],
].forEach(([x, z, scale, blossom]) => world.add(createTree(x, z, scale, blossom)));

for (let index = 0; index < 24; index += 1) {
  const angle = index * 2.4;
  const radius = 2.3 + (index % 5) * 0.82;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  if (!insideCoast(x,z,coastlines.viti) || riverNear(x,z).distance < 1.0 || Math.hypot(x - 3.1, z + 0.5) < 2.0 || Math.hypot(x + 3.4, z - 0.2) < 1.7) continue;
  const flower = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    index % 2 ? materials.lavender : materials.paper,
  );
  flower.position.set(x, 1.09, z);
  world.add(flower);
}

const millingPeople = [];
const personColors = [materials.magenta, materials.mint, materials.lavender, materials.gold, materials.leaf];

function createPerson(x, z, colorIndex, radius, speed, phase, baseY = 1.04) {
  const person = new THREE.Group();
  const bodyMaterial = personColors[colorIndex % personColors.length];
  addCylinder(person, 0.11, 0.15, 0.34, [0, 0.36, 0], bodyMaterial, 10);
  addSphere(person, 0.125, [0, 0.65, 0], materials.skin, [0.92, 1.08, 0.92]);
  addBox(person, [0.07, 0.26, 0.07], [-0.07, 0.12, 0], materials.dark, [0, 0, -0.08]);
  addBox(person, [0.07, 0.26, 0.07], [0.07, 0.12, 0], materials.dark, [0, 0, 0.08]);
  addBox(person, [0.06, 0.3, 0.06], [-0.17, 0.38, 0], materials.skin, [0, 0, 0.25]);
  addBox(person, [0.06, 0.3, 0.06], [0.17, 0.38, 0], materials.skin, [0, 0, -0.25]);
  person.scale.setScalar(0.82);
  person.position.set(x, baseY, z);
  setShadows(person);
  world.add(person);
  millingPeople.push({
    person,
    center: new THREE.Vector2(x, z),
    radius,
    speed,
    angle: phase,
    baseY,
  });
}

[
  [-2.45, 0.55, 0, 0.3, 0.42, 0.2, 1.04],
  [-1.25, 2.55, 1, 0.36, 0.35, 1.7, 1.04],
  [2.8, 1.1, 2, 0.32, 0.46, 2.8, 1.04],
  [3.85, 1.05, 3, 0.3, 0.31, 4.1, 1.04],
  [2.0, -2.05, 4, 0.28, 0.4, 5.3, 1.04],
  [-1.55, 0.1, 2, 0.3, 0.36, 3.3, 1.04],
  [-4.2, 2.0, 3, 0.22, 0.28, 1.1, 1.64],
  [10.6, -11.5, 0, 0.34, 0.44, 0.7, 1.04],
  [4.55, -2.0, 1, 0.24, 0.32, 2.2, 1.04],
].forEach((settings) => createPerson(...settings));

const projectMeshes = [];
Object.values(projectObjects).forEach((group) => {
  group.traverse((child) => {
    if (child.isMesh) projectMeshes.push(child);
  });
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerStart = null;
let hoveredProject = null;

function projectKeyFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData.project) return current.userData.project;
    current = current.parent;
  }
  return null;
}

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function hitProject(event) {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(projectMeshes, false)[0];
  return hit ? projectKeyFromObject(hit.object) : null;
}

function setHoveredProject(key) {
  if (hoveredProject === key) return;
  if (hoveredProject && projectObjects[hoveredProject]) {
    projectObjects[hoveredProject].scale.setScalar(1);
  }
  hoveredProject = key;
  if (hoveredProject && projectObjects[hoveredProject]) {
    projectObjects[hoveredProject].scale.setScalar(1.04);
  }
  canvas.style.cursor = key ? "pointer" : "grab";
}

canvas.addEventListener("pointerdown", (event) => {
  pointerStart = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointermove", (event) => {
  if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) {
    setHoveredProject(null);
    return;
  }
  setHoveredProject(hitProject(event));
});

canvas.addEventListener("pointerup", (event) => {
  if (!pointerStart) return;
  const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  pointerStart = null;
  if (moved > 5) return;
  const key = hitProject(event);
  if (key) openSite(key);
});

canvas.addEventListener("pointerleave", () => {
  pointerStart = null;
  setHoveredProject(null);
});

document.querySelectorAll(".building-sign[data-site]").forEach((sign) => {
  const key = sign.dataset.site;
  sign.addEventListener("pointerenter", () => setHoveredProject(key));
  sign.addEventListener("pointerleave", () => setHoveredProject(null));
});

const trackedLabels = [...document.querySelectorAll("[data-world]")].map((element) => ({
  element,
  point: new THREE.Vector3(...element.dataset.world.split(",").map(Number)),
  width: 0,
  height: 0,
  scale: 1,
}));
const projected = new THREE.Vector3();

function updateLabels() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const placed = [];
  trackedLabels.forEach(({ element, point, width: labelWidth, height: labelHeight, scale }) => {
    projected.copy(point).project(camera);
    const visible = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.15 && Math.abs(projected.y) < 1.15;
    element.style.opacity = visible ? "1" : "0";
    element.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    const anchorX=(projected.x*0.5+0.5)*width;
    const anchorY=(-projected.y*0.5+0.5)*height;
    const candidates=[];
    for(const dx of [0,-0.6,0.6,-1.1,1.1]) for(const dy of [0,-1,1,-2,2,-3]) {
      const x=THREE.MathUtils.clamp(anchorX+dx*labelWidth,labelWidth/2+5,width-labelWidth/2-5);
      const y=Math.max(labelHeight+5,anchorY+dy*(labelHeight+8));
      const overlap=placed.some(box=>x+labelWidth/2+5>box.left && x-labelWidth/2-5<box.right && y>box.top-4 && y-labelHeight<box.bottom+4);
      if(!overlap) candidates.push({x,y,cost:Math.abs(x-anchorX)+Math.abs(y-anchorY)*1.15});
    }
    candidates.sort((a,b)=>a.cost-b.cost);
    const {x,y}=candidates[0]||{x:anchorX,y:anchorY};
    if(labelWidth>0) placed.push({left:x-labelWidth/2,right:x+labelWidth/2,top:y-labelHeight,bottom:y});
    const rotation = element.classList.contains("construction-label") ? " rotate(-2deg)" : "";
    element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%) scale(${scale})${rotation}`;
  });
}

function resizeRenderer() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.45 : 1.85);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(19))*Math.max(1,1.1/camera.aspect)));
  camera.updateProjectionMatrix();
  trackedLabels.forEach(label=>{
    const scale=parseFloat(getComputedStyle(label.element).getPropertyValue("--label-scale"))||1;
    label.scale=scale;
    label.width=label.element.offsetWidth*scale;
    label.height=label.element.offsetHeight*scale;
  });
  updateLabels();
}

new ResizeObserver(resizeRenderer).observe(stage);
resizeRenderer();

function zoomBy(factor) {
  const offset = camera.position.clone().sub(controls.target);
  const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(distance));
  controls.update();
}

zoomInButton.addEventListener("click", () => zoomBy(0.82));
zoomOutButton.addEventListener("click", () => zoomBy(1.22));

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionPaused = motionPreference.matches;

function updateMotionButton() {
  document.body.classList.toggle("motion-paused",motionPaused);
  motionToggle.querySelector("span").textContent = motionPaused ? "▶" : "Ⅱ";
  motionToggle.setAttribute("aria-label", motionPaused ? "Resume motion" : "Pause motion");
  motionToggle.title = motionPaused ? "Resume motion" : "Pause motion";
  motionToggle.setAttribute("aria-pressed", String(motionPaused));
}

motionToggle.addEventListener("click", () => {
  motionPaused = !motionPaused;
  updateMotionButton();
});
updateMotionButton();
motionPreference.addEventListener("change",(event)=>{
  motionPaused=event.matches;
  updateMotionButton();
});

let trainPosition = 0.57;
let worldTime = 0;
const trainSpacing = 0.035;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (!motionPaused) {
    worldTime += delta;
    trainPosition = (trainPosition + delta * 0.024) % 1;
    waterUniforms.time.value = worldTime;
    riverUniforms.time.value = worldTime;
    updateJourneys(worldTime);
    trainWheels.forEach((wheel) => {
      wheel.rotation.x -= delta * 4.7;
    });
    constructionSite.userData.crane.rotation.y = -0.4 + Math.sin(worldTime * 0.28) * 0.22;
    millingPeople.forEach(({ person, center, radius, speed, baseY }, index) => {
      const walker = millingPeople[index];
      walker.angle += delta * speed;
      person.position.set(
        center.x + Math.cos(walker.angle) * radius,
        baseY,
        center.y + Math.sin(walker.angle) * radius,
      );
      person.rotation.y = -walker.angle;
      const stride = Math.sin(worldTime * 5.2 + index) * 0.38;
      person.children[2].rotation.x = stride;
      person.children[3].rotation.x = -stride;
      person.children[4].rotation.x = -stride * 0.75;
      person.children[5].rotation.x = stride * 0.75;
    });
  }

  trainCars.forEach((car, index) => placeTrainCar(car, trainPosition - index * trainSpacing));
  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}

updateJourneys(0);
placeTrainCar(trainCars[0], trainPosition);
placeTrainCar(trainCars[1], trainPosition - trainSpacing);
placeTrainCar(trainCars[2], trainPosition - trainSpacing * 2);
setShadows(world);
animate();

requestAnimationFrame(() => {
  loader.hidden = true;
});
