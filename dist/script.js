import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { openSite } from "./content-view.js";
import { createIslandScene } from "./scene/create-island-scene.js";
import { createIslandRenderer } from "./scene/renderer.js";
import { createIslandCamera, cameraPose } from "./scene/camera.js";

const canvas = document.querySelector("#island-canvas");
const stage = document.querySelector("#island-stage");
const loader = document.querySelector("#scene-loader");
const motionToggle = document.querySelector("#motion-toggle");
const zoomInButton = document.querySelector("#zoom-in");
const zoomOutButton = document.querySelector("#zoom-out");


const renderer = createIslandRenderer(canvas);
const island = createIslandScene({
  createCanvas: () => document.createElement("canvas"),
  maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
});
const { scene, projectObjects, projectMeshes } = island;
const camera = createIslandCamera();
const defaultTarget = new THREE.Vector3(...cameraPose("default").target);
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

let worldTime = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (!motionPaused) {
    worldTime += delta;
    island.update(worldTime);
  }
  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}
animate();
requestAnimationFrame(() => { loader.hidden = true; });
