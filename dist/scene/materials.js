import * as THREE from "three";
import { palette } from "./palette.js";

// Each scene owns its materials and textures. The host supplies canvas creation.
export function createMaterials({ createCanvas, maxAnisotropy = 1 }) {
  function makeGrassTexture() {
    const textureCanvas = createCanvas();
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
    texture.anisotropy = Math.min(8, maxAnisotropy);
    return texture;
  }

  const grassTexture = makeGrassTexture();

  function makeBrickTexture(baseColor, brickColor, mortarColor) {
    const textureCanvas = createCanvas();
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
    texture.anisotropy = Math.min(8, maxAnisotropy);
    return texture;
  }

  function makeCobbleTexture() {
    const textureCanvas = createCanvas();
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
    texture.anisotropy = Math.min(8, maxAnisotropy);
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


  return materials;
}
