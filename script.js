let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let src, gray, targetImage;

// Set up Three.js scene, camera, renderer
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);  // Transparent background
document.body.appendChild(renderer.domElement);

// Load the GLB model
let loader = new THREE.GLTFLoader();
let model;
loader.load('model.glb', function (gltf) {
  model = gltf.scene;
  model.scale.set(0.5, 0.5, 0.5);  // Adjust the scale of your model
  scene.add(model);
  model.visible = false;  // Hide the model initially
});

// Set up a simple light
let ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// Function to track image and show GLB model
function onOpenCvReady() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      video.play();
    })
    .catch(err => console.error("Error accessing webcam: ", err));

  targetImage = cv.imread('tracking_image.jpg');
  cv.cvtColor(targetImage, targetImage, cv.COLOR_RGBA2GRAY, 0);

  src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
  gray = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC1);
  
  trackImage();
}

function trackImage() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    src.data.set(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let orb = new cv.ORB();
    let keypoints1 = new cv.KeyPointVector();
    let keypoints2 = new cv.KeyPointVector();
    let descriptors1 = new cv.Mat();
    let descriptors2 = new cv.Mat();

    orb.detectAndCompute(targetImage, new cv.Mat(), keypoints1, descriptors1);
    orb.detectAndCompute(gray, new cv.Mat(), keypoints2, descriptors2);

    let bf = new cv.BFMatcher(cv.NORM_HAMMING, true);
    let matches = new cv.DMatchVector();
    bf.match(descriptors1, descriptors2, matches);

    // If image is tracked, show the 3D model
    if (matches.size() > 20) {
      model.visible = true;

      // Position the model on the tracked image (you may need to adjust these values)
      model.position.set(0, 0, -3);  // Adjust based on where you want to place the model
      camera.position.set(0, 0, 5);  // Adjust the camera position
    } else {
      model.visible = false;  // Hide the model when the image is not tracked
    }

    descriptors1.delete(); descriptors2.delete();
    keypoints1.delete(); keypoints2.delete();
    matches.delete();
  }

  renderer.render(scene, camera);  // Render the three.js scene
  requestAnimationFrame(trackImage);
}

// Wait for OpenCV.js to load
window.addEventListener('load', () => {
  if (typeof cv === 'undefined') {
    console.error('OpenCV.js not ready');
  } else {
    onOpenCvReady();
  }
});
