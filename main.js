import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";


let container;
let camera, scene, renderer;
let controller;
let onThrow = false;
let isSelectEndProcessing = false;

let reticle;
let ball;
let ballBody;
let planeOrientation;
let hoopSelection = true;
let groundSelection = false;

let hitTestSource = null;
let hitTestSourceRequested = false;

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  // camera
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // renderer

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // AR Button

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  function onSelect() {
    if (reticle.visible && Math.abs(planeOrientation.x) >= 0.4) {
      console.log(reticle.matrixWorld[12], reticle.matrixWorld[13], reticle.matrixWorld[14])
      let hoopGeometry = new THREE.TorusGeometry(0.22, 0.02, 12, 12, 360);
      let hoopMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
      let hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);
      reticle.matrix.decompose(hoop.position, hoop.quaternion, hoop.scale);
      hoop.lookAt(0, controller.position.y, 0);
      hoop.rotateX(Math.PI / 2);
      scene.add(hoop);
      // Physics: add hoop body
      const hoopShape = CANNON.Trimesh.createTorus(0.22, 0.05, 12, 12, 360);
      const hoopBody = new CANNON.Body({
        mass: 0,
        material: hoopBodyMaterial,
        shape: hoopShape,
        position: new CANNON.Vec3(
          hoop.position.x,
          hoop.position.y,
          hoop.position.z
        ),
      });
      hoopBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        -Math.PI / 2
      );
      world.addBody(hoopBody);
      const wallShape = new CANNON.Plane();
      const wallBody = new CANNON.Body({
        mass: 0,
        material: wallBodyMaterial,
        shape: wallShape,
        position: new CANNON.Vec3(
          reticle.matrixWorld.elements[12],
          reticle.matrixWorld.elements[13],
          reticle.matrixWorld.elements[14]
        ),
      });
      wallBody.quaternion.setFromEuler(0, -Math.PI / 2, 0);
      world.addBody(wallBody)

      // add ball to scene in front of camera
      let textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(
        "assets/textures/basketball-texture.jpg"
      );
      const ballGeometry = new THREE.SphereGeometry(0.125, 32, 32);
      const ballMaterial = new THREE.MeshStandardMaterial({ map: texture });
      ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.position.set(0, 0, -0.5).applyMatrix4(controller.matrixWorld);
      ball.quaternion.setFromRotationMatrix(controller.matrixWorld);
      scene.add(ball);
      controller.removeEventListener("select", onSelect);
      hoopSelection = false
      groundSelection = true
      controller.addEventListener("select", onSelectGround);

      // remove reticle from scene
      // scene.remove(reticle);
    }
  }
  function onSelectGround() {
    if (reticle.visible && Math.abs(planeOrientation.x) <= 0.2) {
      console.log(reticle.matrixWorld.elements[12])
      // Physics: add ground body
      const groundShape = new CANNON.Plane();
      const groundBody = new CANNON.Body({
        mass: 0,
        material: groundBodyMaterial,
        shape: groundShape,
        position: new CANNON.Vec3(
          reticle.matrixWorld.elements[12],
          reticle.matrixWorld.elements[13],
          reticle.matrixWorld.elements[14]
        ),
      });
      groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
      world.addBody(groundBody);
      scene.remove(reticle);
      controller.removeEventListener("select", onSelectGround);
      controller.addEventListener("selectstart", () => {
        if (!isSelectEndProcessing) {
          const ballShape = new CANNON.Sphere(0.125);
          ballBody = new CANNON.Body({
            mass: 1,
            material: ballBodyMaterial,
            shape: ballShape,
            position: new CANNON.Vec3(
              ball.position.x,
              ball.position.y,
              ball.position.z
            ),
          });
          world.addBody(ballBody);
        }
      });

      controller.addEventListener("selectend", () => {
        if (!isSelectEndProcessing) {
          isSelectEndProcessing = true;
          onThrow = true;
          ballBody.position.set(
            controller.position.x,
            controller.position.y,
            controller.position.z
          );
          ball.position.copy(ballBody.position);
          const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(
            controller.quaternion
          );
          const speed = 5;
          ballBody.velocity.set(
            direction.x * speed,
            direction.y * speed,
            direction.z * speed
          );

          setTimeout(() => {
            onThrow = false;
            isSelectEndProcessing = false;
          }, 4000);
        }
      });
    }
  }

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);


  // reticle
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );

  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener("resize", onWindowResize);
}

//physics
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const ballBodyMaterial = new CANNON.Material();
const hoopBodyMaterial = new CANNON.Material();
const groundBodyMaterial = new CANNON.Material();
const wallBodyMaterial = new CANNON.Material();

// const cannonDebugger = new CannonDebugger(scene, world, {
//   // options...
// });
/**
 * Handles the window resize event.
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Animates the scene.
 */
function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then(function (referenceSpace) {
        session
          .requestHitTestSource({
            space: referenceSpace,
          })
          .then(function (source) {
            hitTestSource = source;
          });
      });

      session.addEventListener("end", function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        planeOrientation = hit.getPose(referenceSpace).transform.orientation;
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  // cannonDebugger.update();
  if (ball && controller && !onThrow && !isSelectEndProcessing) {
    ball.position.set(0, 0, -0.5).applyMatrix4(controller.matrixWorld);
    ball.quaternion.setFromRotationMatrix(controller.matrixWorld);
  }
  if (ball && controller && onThrow && isSelectEndProcessing) {
    world.step(1 / 60);
    ball.position.copy(ballBody.position);
    ball.quaternion.copy(ballBody.quaternion);
  }
  if (reticle.visible && planeOrientation) {
  if (hoopSelection && Math.abs(planeOrientation.x) >= 0.4) {
    reticle.material.color.set(0x17DF16);
  } else if (hoopSelection &&  Math.abs(planeOrientation.x) < 0.4) {
    reticle.material.color.set(0xF61010);
  }
  if (groundSelection &&  Math.abs(planeOrientation.x) <= 0.2) {
    reticle.material.color.set(0x17DF16);
  } else if (groundSelection && Math.abs(planeOrientation.x) > 0.2) {
    reticle.material.color.set(0xF61010);
  }

}
  renderer.render(scene, camera);
}




