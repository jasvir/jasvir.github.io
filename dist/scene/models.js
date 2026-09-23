import * as THREE from "three";
import { addBox, addCylinder, addSphere, createGableRoof, setShadows } from "./primitives.js";

export function createModels(materials) {
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

  const buildingFactories = {
    library: createLibrary,
    observatory: createObservatory,
    factory: createFactory,
    station: createStation,
    cottages: (site) => createTownMarker(0, 0, site.accent),
  };

  return { createEngine, createCarriage, buildingFactories };
}
