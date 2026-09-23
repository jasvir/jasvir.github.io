import * as THREE from "three";
import { coastlines } from "../coastlines.js";
import { islandLayout } from "../island-layout.js";
import { createMaterials } from "./materials.js";
import { createModels } from "./models.js";
import { addBox, addCylinder, addSphere, setShadows, makeIrregularCylinder } from "./primitives.js";
import { createSceneAnimator } from "./animation.js";

// No page controls, event handlers, render loop, or camera are created here.
export function createIslandScene({ createCanvas, maxAnisotropy = 1, layout = islandLayout } = {}) {
  if (typeof createCanvas !== "function") throw new TypeError("createIslandScene requires createCanvas");
  const islandLayout = layout;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2fbfb, 48, 95);
  const materials = createMaterials({ createCanvas, maxAnisotropy });
  const { createEngine, createCarriage, buildingFactories } = createModels(materials);
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

  const trainWheels = [];
  const trainCars = [
    createEngine(trainWheels),
    createCarriage(trainWheels),
    createCarriage(trainWheels, materials.lavender),
  ];
  trainCars.forEach((car) => world.add(car));

  function markProject(group, key) {
    group.userData.project = key;
    group.traverse((child) => {
      child.userData.project = key;
    });
    return group;
  }

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
      phase,
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


  const update = createSceneAnimator({
    trainCars, trainWheels, trackCurve, waterUniforms, riverUniforms,
    constructionSite, millingPeople, harbor, sailingRoute, aeroplane, flightRoute,
  });
  setShadows(world);
  update(0);
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set();
    const ownedMaterials = new Set(Object.values(materials));
    const textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material || [])) ownedMaterials.add(material);
      object.shadow?.dispose();
    });
    for (const material of ownedMaterials) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    }
    textures.forEach(texture => texture.dispose());
    geometries.forEach(geometry => geometry.dispose());
    scene.clear();
  }
  return { scene, world, projectObjects, projectMeshes, update, dispose };
}
