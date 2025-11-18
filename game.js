// Game constants
const GRID_SIZE = 1;
const LANE_WIDTH = 1;
const MAX_LANES = 15;
const MOVE_SPEED = 0.2;
const ANIMATION_DURATION = 200;

// Game state
let scene, camera, renderer;
let player;
let lanes = [];
let vehicles = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameRunning = false;
let isMoving = false;
let furthestZ = 0;
let difficulty = 1;

// Initialize the game
function init() {
    // Setup Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

    // Setup camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);

    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create player (Siamese cat)
    createPlayer();

    // Generate initial lanes
    for (let i = 0; i < MAX_LANES; i++) {
        createLane(i - 5);
    }

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    // Update high score display
    document.getElementById('high-score').textContent = `High Score: ${highScore}`;

    // Start render loop
    animate();
}

// Create Siamese cat player
function createPlayer() {
    const group = new THREE.Group();

    // Siamese cat colors
    const creamColor = 0xF5DEB3;
    const brownColor = 0x6B4423;
    const blueEyeColor = 0x1E90FF;

    // Body (cream colored)
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: creamColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Head (cream with brown face)
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, 0.75, 0.5);
    head.castShadow = true;
    group.add(head);

    // Face (brown)
    const faceGeometry = new THREE.BoxGeometry(0.51, 0.4, 0.1);
    const faceMaterial = new THREE.MeshLambertMaterial({ color: brownColor });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.set(0, 0.75, 0.75);
    group.add(face);

    // Ears (brown)
    const earGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.15);
    const earMaterial = new THREE.MeshLambertMaterial({ color: brownColor });

    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.2, 1.05, 0.5);
    leftEar.castShadow = true;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.2, 1.05, 0.5);
    rightEar.castShadow = true;
    group.add(rightEar);

    // Eyes (blue)
    const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.05);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: blueEyeColor });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 0.8, 0.78);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12, 0.8, 0.78);
    group.add(rightEye);

    // Legs (brown)
    const legGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const legMaterial = new THREE.MeshLambertMaterial({ color: brownColor });

    const positions = [
        [-0.2, 0.2, 0.3],
        [0.2, 0.2, 0.3],
        [-0.2, 0.2, -0.2],
        [0.2, 0.2, -0.2]
    ];

    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(...pos);
        leg.castShadow = true;
        group.add(leg);
    });

    // Tail (cream with brown tip)
    const tailGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.set(0, 0.6, -0.6);
    tail.rotation.x = -0.5;
    tail.castShadow = true;
    group.add(tail);

    const tailTipGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.2);
    const tailTip = new THREE.Mesh(tailTipGeometry, faceMaterial);
    tailTip.position.set(0, 0.5, -0.9);
    tailTip.rotation.x = -0.5;
    tailTip.castShadow = true;
    group.add(tailTip);

    player = group;
    player.position.set(0, 0, 0);
    scene.add(player);
}

// Create a lane (road or grass)
function createLane(zPos) {
    const lane = {
        z: zPos,
        isRoad: Math.random() > 0.3,
        mesh: null,
        direction: Math.random() > 0.5 ? 1 : -1,
        speedMultiplier: 1 + Math.random() * 0.5
    };

    // Create lane mesh
    const geometry = new THREE.BoxGeometry(10, 0.2, LANE_WIDTH);
    let material;

    if (lane.isRoad) {
        material = new THREE.MeshLambertMaterial({ color: 0x404040 });
    } else {
        material = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    }

    lane.mesh = new THREE.Mesh(geometry, material);
    lane.mesh.position.set(0, 0, zPos);
    lane.mesh.receiveShadow = true;
    scene.add(lane.mesh);

    // Add road markings
    if (lane.isRoad) {
        const lineGeometry = new THREE.BoxGeometry(0.2, 0.21, 0.4);
        const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

        for (let x = -4; x <= 4; x += 2) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.set(x, 0.1, zPos);
            scene.add(line);
            lane.mesh.userData.lines = lane.mesh.userData.lines || [];
            lane.mesh.userData.lines.push(line);
        }
    }

    lanes.push(lane);
}

// Create vehicle
function createVehicle(lane, startX) {
    const colors = [0xFF0000, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const group = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.4, 1);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    body.castShadow = true;
    group.add(body);

    // Car roof
    const roofGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.6);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.y = 0.65;
    roof.castShadow = true;
    group.add(roof);

    // Wheels
    const wheelGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    const wheelPositions = [
        [-0.35, 0.1, 0.4],
        [0.35, 0.1, 0.4],
        [-0.35, 0.1, -0.4],
        [0.35, 0.1, -0.4]
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(...pos);
        wheel.castShadow = true;
        group.add(wheel);
    });

    const baseSpeed = 0.02 * difficulty;
    const vehicle = {
        mesh: group,
        lane: lane,
        speed: baseSpeed * lane.speedMultiplier * lane.direction,
        bounds: { width: 0.6, length: 1 }
    };

    vehicle.mesh.position.set(startX, 0, lane.z);

    // Face the direction of movement
    if (lane.direction === -1) {
        vehicle.mesh.rotation.y = Math.PI;
    }

    scene.add(vehicle.mesh);
    vehicles.push(vehicle);

    return vehicle;
}

// Spawn vehicles on roads
function spawnVehicles() {
    lanes.forEach(lane => {
        if (lane.isRoad && Math.random() < 0.02 * difficulty) {
            const startX = lane.direction === 1 ? -6 : 6;
            // Check if there's space for a new vehicle
            const hasNearbyVehicle = vehicles.some(v =>
                v.lane === lane && Math.abs(v.mesh.position.x - startX) < 3
            );

            if (!hasNearbyVehicle) {
                createVehicle(lane, startX);
            }
        }
    });
}

// Move player
function movePlayer(dx, dz) {
    if (isMoving || !gameRunning) return;

    isMoving = true;
    const targetX = player.position.x + dx * GRID_SIZE;
    const targetZ = player.position.z + dz * GRID_SIZE;

    // Boundary check
    if (Math.abs(targetX) > 4) {
        isMoving = false;
        return;
    }

    const startX = player.position.x;
    const startZ = player.position.z;
    const startTime = Date.now();

    // Add slight hop animation
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

        player.position.x = startX + (targetX - startX) * progress;
        player.position.z = startZ + (targetZ - startZ) * progress;

        // Hop effect
        const hopHeight = Math.sin(progress * Math.PI) * 0.3;
        player.position.y = hopHeight;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isMoving = false;

            // Update score if moved forward
            if (dz < 0 && player.position.z < furthestZ) {
                furthestZ = player.position.z;
                score = Math.floor(Math.abs(furthestZ) * 10);
                document.getElementById('score').textContent = `Score: ${score}`;

                // Increase difficulty
                difficulty = 1 + Math.abs(furthestZ) * 0.05;
            }

            checkCollision();
            updateWorld();
        }
    };

    animate();
}

// Check collision with vehicles
function checkCollision() {
    const playerBounds = {
        x: player.position.x,
        z: player.position.z,
        width: 0.6,
        length: 0.8
    };

    for (let vehicle of vehicles) {
        const vPos = vehicle.mesh.position;

        if (Math.abs(playerBounds.x - vPos.x) < (playerBounds.width + vehicle.bounds.width) / 2 &&
            Math.abs(playerBounds.z - vPos.z) < (playerBounds.length + vehicle.bounds.length) / 2) {
            gameOver();
            return;
        }
    }
}

// Update world (lanes and camera)
function updateWorld() {
    const playerZ = player.position.z;

    // Update camera to follow player
    camera.position.z = playerZ + 8;
    camera.lookAt(0, 0, playerZ);

    // Generate new lanes ahead
    const frontLane = lanes.reduce((min, lane) =>
        lane.z < min.z ? lane : min
    );

    if (frontLane.z > playerZ - MAX_LANES) {
        createLane(frontLane.z - 1);
    }

    // Remove old lanes behind
    lanes = lanes.filter(lane => {
        if (lane.z > playerZ + 10) {
            scene.remove(lane.mesh);
            if (lane.mesh.userData.lines) {
                lane.mesh.userData.lines.forEach(line => scene.remove(line));
            }
            return false;
        }
        return true;
    });
}

// Update vehicles
function updateVehicles() {
    vehicles.forEach(vehicle => {
        vehicle.mesh.position.x += vehicle.speed;
    });

    // Remove vehicles that are off screen
    vehicles = vehicles.filter(vehicle => {
        if (Math.abs(vehicle.mesh.position.x) > 8) {
            scene.remove(vehicle.mesh);
            return false;
        }
        return true;
    });

    // Spawn new vehicles
    spawnVehicles();
}

// Keyboard input
function onKeyDown(event) {
    if (!gameRunning || isMoving) return;

    switch(event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            movePlayer(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            movePlayer(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            movePlayer(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            movePlayer(1, 0);
            break;
    }
}

// Window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start game
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameRunning = true;
    score = 0;
    furthestZ = 0;
    difficulty = 1;
    document.getElementById('score').textContent = 'Score: 0';
}

// Restart game
function restartGame() {
    // Reset player position
    player.position.set(0, 0, 0);

    // Clear vehicles
    vehicles.forEach(vehicle => scene.remove(vehicle.mesh));
    vehicles = [];

    // Reset lanes
    lanes.forEach(lane => {
        scene.remove(lane.mesh);
        if (lane.mesh.userData.lines) {
            lane.mesh.userData.lines.forEach(line => scene.remove(line));
        }
    });
    lanes = [];

    // Regenerate lanes
    for (let i = 0; i < MAX_LANES; i++) {
        createLane(i - 5);
    }

    // Reset game state
    score = 0;
    furthestZ = 0;
    difficulty = 1;
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);

    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('score').textContent = 'Score: 0';
    gameRunning = true;
}

// Game over
function gameOver() {
    gameRunning = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        document.getElementById('high-score').textContent = `High Score: ${highScore}`;
    }

    document.getElementById('final-score').textContent = `Score: ${score}`;
    document.getElementById('game-over').classList.remove('hidden');
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (gameRunning) {
        updateVehicles();

        // Slight tail animation
        if (player.children.length > 0) {
            const time = Date.now() * 0.003;
            const tail = player.children.find(child =>
                child.geometry && child.geometry.parameters &&
                child.geometry.parameters.depth === 0.5
            );
            if (tail) {
                tail.rotation.z = Math.sin(time) * 0.1;
            }
        }
    }

    renderer.render(scene, camera);
}

// Initialize game when page loads
window.addEventListener('load', init);
