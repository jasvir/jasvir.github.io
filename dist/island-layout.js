// Stable scene plan. Content belongs in content.js, never in these coordinates.
// Positions use [x, height, z]; paths on the ground use [x, z].
// Coastlines remain in coastlines.js: east is +x, north is -z.
export const islandLayout = {
  version: 1,
  // Look from due south: north stays up, east stays right, and the About Me
  // coast faces the bottom of the map. Keep the familiar 3D tilt and distance.
  camera: { position: [6.2, 25, 32.4], target: [6.2, 0.7, -5.8] },
  sites: {
    library: {
      name: "Reading room", model: "library",
      position: [-3.4, 1, 0.2], label: [-3.4, 2.9, 0.2],
    },
    research: {
      name: "Research annex", model: "observatory",
      position: [-1.4, 1, 0.8], label: [-1.4, 3.55, 0.8],
    },
    factory: {
      name: "Factory & archive", model: "factory",
      position: [3.25, 1, -0.45], label: [3.25, 3, -0.45],
    },
    plush: {
      name: "Plush station", model: "station",
      position: [-2.5, 1, 2], label: [-2.5, 2.6, 2],
    },
    home: {
      name: "About Me", model: "cottages", icon: "⌂",
      position: [4.65, 1, 2.75], label: [4.65, 2.8, 2.75],
      accent: 0xc0ffee, rotation: -0.28,
    },
    writing: {
      name: "Writing house", model: "cottages", icon: "✎",
      position: [12.25, 1, -13.45], label: [12.25, 2.8, -13.45],
      accent: 0xfacade, rotation: 0.18,
    },
    twoDozen: {
      name: "Two Dozen", model: "sign", icon: "✧",
      position: [13.85, 1, -13.75], label: [13.85, 2.8, -13.75],
    },
    video: {
      name: "Picture house", model: "cottages", icon: "▶",
      position: [12.55, 1, -11], label: [12.55, 2.8, -11],
      accent: 0xdec0de, rotation: -0.32,
    },
  },
  landmarks: {
    mountain: [-2.7, 0, -1.8],
    bridge: [1.4, 0, 2.6],
    station: [-2.5, 1, 2],
    dock: [5.25, -0.34, 4.65],
    dockRotation: -0.3,
    construction: [8.3, 1, -10.6],
    scaffolding: [15.4, 1, -12.5],
  },
  constructionLabels: [
    { position: [8.3, 2.1, -10.6], text: "under construction" },
    { position: [15.4, 2.3, -12.5], text: "something, probably" },
  ],
  paths: [
    { points: [[-3.4, 0.1], [-2.5, 0.8], [-2.7, 2.15]], width: 0.16 },
    { points: [[-3.4, 0.1], [-2.5, 0.6], [-1.4, 0.8]], width: 0.14 },
    { points: [[3.7, 0.4], [4.6, 1.3], [4.8, 2.8]], width: 0.13 },
    { points: [[11.8, -13.6], [11.2, -12.3], [12.5, -11.4]], width: 0.12 },
  ],
  river: [
    [0.35, 0.45, -1.3], [0.95, 0.43, -0.9], [0.65, 0.4, -0.1],
    [1.65, 0.36, 0.75], [1.4, 0.3, 2.6], [1.75, 0.18, 3.65],
    [1.9, -0.35, 4.6], [2.15, -0.6, 5.25], [2.8, -0.61, 6.5],
  ],
  // Two points = straight track; four points = cubic curve. Keep the bridge
  // and tunnel segments straight so the train fits through their openings.
  railway: [
    [[-4.55,1.18,-1.8],[-0.8,1.18,-1.8]],
    [[-0.8,1.18,-1.8],[0.1,1.18,-1.8],[0.1,1.18,-3],[1.7,1.18,-2.8]],
    [[1.7,1.18,-2.8],[3.2,1.18,-2.7],[5.4,1.18,-1.5],[5.25,1.18,0]],
    [[5.25,1.18,0],[5.4,1.18,1.6],[4.5,1.9,2.6],[3.4,2.08,2.6]],
    [[3.4,2.08,2.6],[-0.6,2.08,2.6]],
    [[-0.6,2.08,2.6],[-1.5,1.85,2.6],[-1.6,1.18,3.65],[-3.4,1.18,2.9]],
    [[-3.4,1.18,2.9],[-5.3,1.18,2.7],[-6.3,1.18,1.3],[-5.15,1.18,-0.3]],
    [[-5.15,1.18,-0.3],[-4.7,1.18,-0.8],[-5.4,1.18,-1.8],[-4.55,1.18,-1.8]],
  ],
  sailing: [
    [6.55,5], [8.85,3.8], [9.15,1.1], [8.6,-2.9], [4.6,-5.5],
    [0.5,-6.4], [-3.6,-5.1], [-6.7,-3.1], [-8.3,0.3], [-8.4,3.4],
    [-5.4,5.6], [-3.4,5.8], [-1.3,6.1], [0,7.5], [3.65,7.5],
  ],
  flight: [
    [6,3.7,-0.6], [7.5,4.5,-4], [9.8,4.1,-8],
    [10.6,3,-10.9], [9.6,2.9,-11.7], [8.1,3.7,-9.1],
    [5.8,4.7,-5.8], [4.5,4.4,-2.8], [4.6,3.8,-0.25],
  ],
};
