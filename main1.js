"use strict";

import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
let throws = 0;
let score = 0;
const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.001, 1000);

const light = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(light);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.listenToKeyEvents(window);
controls.addEventListener("change", () => {
  console.log(camera.position, camera.rotation);
});

const OPTIMAL_CAMERA_POSITION = {
  x: -0.86,
  y: 4.42,
  z: 0,
};

const hoopGeometry = new THREE.TorusGeometry(0.22, 0.03, 12, 12, 360);
const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xff8000 });
const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);
hoop.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
hoop.position.y = 3.05;
hoop.position.x = -10;
hoop.position.z = 0;
scene.add(hoop);

let textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load("assets/textures/basketball-texture.jpg");
const ballGeometry = new THREE.SphereGeometry(0.125, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ map: texture });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.x = -6;
ball.position.y = 1;
ball.position.z = 0;
scene.add(ball);

const geometry = new THREE.PlaneGeometry(28.7, 15.2);
const courtTexture = textureLoader.load("assets/textures/court1.jpg");
const material = new THREE.MeshBasicMaterial({ map: courtTexture });
const plane = new THREE.Mesh(geometry, material);
plane.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

scene.add(plane);

const loader = new FontLoader();
function createText() {
  loader.load("assets/fonts/font.json", function (font) {
    const textGeometry = new TextGeometry(
      `${score} buckets/${throws} attempts`,
      {
        font: font,
        size: 0.5,
        height: 0.2,
        curveSegments: 12,
        bevelEnabled: false,
        bevelThickness: 0.5,
        bevelSize: 0.3,
        bevelOffset: 0,
        bevelSegments: 5,
      }
    );
    let materials = [
      new THREE.MeshPhongMaterial({
        color: 0xff22cc,
        flatShading: true,
      }),
      new THREE.MeshPhongMaterial({
        color: 0xffcc22,
      }),
    ];
    const textMesh = new THREE.Mesh(textGeometry, materials);
    textMesh.name = "text";
    scene.add(textMesh);
    textMesh.position.x = -10;
    textMesh.position.y = 4;
    textMesh.position.z = 4;
    textMesh.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  });
}
createText();
function updateText() {
  const textMesh = scene.getObjectByName("text");
  scene.remove(textMesh);
  createText();
}

let testModel = null;
function loadData() {
  new GLTFLoader()
    .setPath("assets/models/")
    .load("basketball_hoop.glb", gltfReader);
}

function gltfReader(gltf) {
  testModel = gltf.scene;

  if (testModel != null) {
    console.log("Model loaded:  " + testModel);
    scene.add(gltf.scene);
    testModel.position.x = -11;
    testModel.position.y = 2;
    testModel.position.z = 0;
  } else {
    console.log("Load FAILED.  ");
  }
}

loadData();

camera.position.x = OPTIMAL_CAMERA_POSITION.x;
camera.position.y = OPTIMAL_CAMERA_POSITION.y;
camera.position.z = OPTIMAL_CAMERA_POSITION.z;
camera.rotation.set(-1.541106020525095, 1.0264365121565828, 1.5360931904638087);

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const ballBodyMaterial = new CANNON.Material();
const hoopBodyMaterial = new CANNON.Material();
const boardBodyMaterial = new CANNON.Material();

const ballShape = new CANNON.Sphere(0.125);
const ballBody = new CANNON.Body({
  mass: 1,
  material: ballBodyMaterial,
  shape: ballShape,
  position: new CANNON.Vec3(-6, 1, 0),
});
world.addBody(ballBody);

const hoopShape = CANNON.Trimesh.createTorus(0.22, 0.05, 12, 12, 360);
const hoopBody = new CANNON.Body({
  mass: 0,
  material: hoopBodyMaterial,
  shape: hoopShape,
  position: new CANNON.Vec3(-10, 3.05, 0),
});
hoopBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(hoopBody);

const boardShape = new CANNON.Box(new CANNON.Vec3(0.8, 0.5, 0.2));
const boardBody = new CANNON.Body({
  mass: 0,
  material: boardBodyMaterial,
  shape: boardShape,
  position: new CANNON.Vec3(-10.5, 3.3, 0),
});
boardBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);

world.addBody(boardBody);

const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body();
groundBody.mass = 0;
groundBody.addShape(groundShape);
console.log(groundBody.position);
groundBody.position.y = 0;
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

const boxShape = new CANNON.Box(new CANNON.Vec3(0.2, 0.2, 0.2));
const triggerBody = new CANNON.Body({ isTrigger: true });
triggerBody.addShape(boxShape);
triggerBody.position.set(-10, 2.65, 0);
world.addBody(triggerBody);

triggerBody.addEventListener("collide", (event) => {
  if (event.body === ballBody) {
    score++;
    console.log(score);
  }
});
const cannonDebugger = new CannonDebugger(scene, world, {
  // options...
});
window.addEventListener("keydown", function (event) {
  if (event.code === "Space" && ballBody.position.x === -6) {
    ballBody.velocity.set(-4, Math.random() * 2 + 9, 0);
    this.setTimeout(returnToFreeThrow, 4500);
    throws++;
  }
  console.log(throws);
});

function returnToFreeThrow() {
  ballBody.position = new CANNON.Vec3(-6, 0, 0);
  ballBody.velocity.set(0, 0, 0);
  ballBody.angularVelocity.set(0, 0, 0);
  updateText();
}

const clock = new THREE.Clock();

// Main loop
const animation = () => {
  renderer.setAnimationLoop(animation); // requestAnimationFrame() replacement, compatible with XR

  if (testModel) {
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    world.step(1 / 60);
    // cannonDebugger.update();
    ball.position.copy(ballBody.position);
    ball.quaternion.copy(ballBody.quaternion);
    hoop.position.copy(hoopBody.position);
    hoop.quaternion.copy(hoopBody.quaternion);

    // Render the scene

    renderer.render(scene, camera);
  }
};

animation();

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
