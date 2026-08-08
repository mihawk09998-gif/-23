// Programmed Love — Three.js Upright 3D Heart Engine with Zoom Controls

class ThreeHeartEngine {
    constructor() {
        this.container = document.getElementById('canvasContainer');
        this.isAdmin = document.body.classList.contains('mode-admin');

        // State Machine: 'spiral' | 'warp' | 'heart'
        this.modeState = 'spiral';
        this.warpStartTime = 0;
        this.warpDuration = 1800; // 1.8 seconds transition

        // Access Control Flag: Gate Screen must be passed first
        this.isAccessGranted = false;
        this.currentUser = 'asema'; // 'asema' | 'malika'

        // Settings State
        this.displayText = "i love you";
        this.colorTheme = "#ff1493";
        this.rotationSpeed = 1.0;
        this.density = 220;
        this.showStars = true;
        this.audioEnabled = false;

        // Parallax Mouse tracking
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetMouseX = 0;
        this.targetMouseY = 0;

        // Interactive 3D Rotation & Zoom for Heart
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.heartRotationX = 0;
        this.heartRotationY = 0;
        this.zoom = 70; // Camera Z distance

        // Three.js Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // THREE.Raycaster & Particle Burst System
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        this.activeBursts = [];

        // Group objects & Easter Egg elements
        this.spiralGroup = null;
        this.starParticles = null;
        this.saturnRingGroup = null;
        this.coreSphere = null;
        this.coreHalo = null;

        // Spiral Elements Data Array
        this.spiralElements = [];
        this.phrases = ["Te amo", "I love you", "Я тебя люблю"];
        this.magentaPalette = ["#ff1493", "#ff007f", "#ff4d8d", "#ff7396", "#e60039"];

        this.initThree();
        this.init();
    }

    initThree() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. Scene with transparent background
        this.scene = new THREE.Scene();

        // 2. Camera with responsive mobile FOV
        const aspect = width / height;
        const fov = aspect < 1 ? 72 : 60;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, this.zoom);

        // 3. Transparent WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0x000000, 0); // Transparent clear color
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        if (this.container) {
            this.container.appendChild(this.renderer.domElement);
        }

        // 4. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xff1493, 2, 200);
        pointLight.position.set(0, 0, 50);
        this.scene.add(pointLight);

        // Main Spiral / Heart Group
        this.spiralGroup = new THREE.Group();
        this.scene.add(this.spiralGroup);
    }

    populateBgPattern() {
        const bg = document.getElementById('bg-pattern');
        if (!bg) return;

        bg.innerHTML = '';
        const rowHeight = 20;
        const totalRows = Math.ceil(window.innerHeight / rowHeight) + 4;
        const phrase = "LOVE YOU   ".repeat(30);

        for (let r = 0; r < totalRows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'bg-row';
            rowDiv.textContent = phrase;
            bg.appendChild(rowDiv);
        }
    }

    initGateScreen() {
        const gateScreen = document.getElementById('gateScreen');
        const gateCard = document.getElementById('gateCard');
        const gateInput = document.getElementById('gateInput');
        const gateBtn = document.getElementById('gateBtn');
        const gateError = document.getElementById('gateError');

        if (this.isAdmin) {
            this.isAccessGranted = true;
            if (gateScreen) gateScreen.classList.add('hidden');
            return;
        }

        if (!gateScreen || !gateInput || !gateBtn) return;

        const handleVerification = (e) => {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }

            const val = (gateInput.value || '').toLowerCase().trim();

            if (val === 'асема' || val === 'асем') {
                this.currentUser = 'asema';
                this.preloadUserPhoto('asema');
                gateError.textContent = '';
                gateScreen.classList.add('hidden');
                this.isAccessGranted = true;
            } else if (val === 'малика') {
                gateError.textContent = 'день рождение всего один раз в году, а попросить салиха дать доступ можно в любой день';
                gateCard.classList.remove('shake');
                void gateCard.offsetWidth; // Reflow to restart shake animation
                gateCard.classList.add('shake');
            } else {
                gateError.textContent = 'твоего имени нету в сердце салиха...';
                gateCard.classList.remove('shake');
                void gateCard.offsetWidth; // Reflow to restart shake animation
                gateCard.classList.add('shake');
            }
        };

        gateBtn.addEventListener('click', handleVerification);
        gateInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleVerification(e);
            }
        });
    }

    initSaturnRing() {
        this.saturnRingGroup = new THREE.Group();
        this.saturnRingGroup.rotation.x = 0.35;
        this.saturnRingGroup.rotation.z = 0.08;

        const count = 800;
        const items = ["I LOVE YOU", "I love you", "Te amo", "♥", "LOVE YOU", "♥", "Я тебя люблю"];
        const colors = ["#ff1493", "#ff007f", "#ff4d8d", "#ff7396", "#ffffff", "#ff80ab"];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
            const radius = 55 + Math.random() * 80;

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * 2.4;

            const text = items[i % items.length];
            const color = colors[i % colors.length];
            const texture = this.createGlowingTextTexture(text, color);
            const mat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.88 + Math.random() * 0.12
            });

            const sprite = new THREE.Sprite(mat);
            const scaleBase = text === "♥" ? 4.5 : 8.5;
            const scaleVar = Math.random() * 3.0;
            const sW = scaleBase + scaleVar;
            sprite.scale.set(sW, sW * 0.25, 1);
            sprite.position.set(x, y, z);

            this.saturnRingGroup.add(sprite);
        }

        this.saturnRingGroup.visible = false;
        this.spiralGroup.add(this.saturnRingGroup);
    }

    initCentralCore() {
        const geo = new THREE.SphereGeometry(2.4, 32, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff1493,
            wireframe: false
        });
        this.coreSphere = new THREE.Mesh(geo, mat);

        const haloTex = this.createSparkTexture("#ff007f");
        const haloMat = new THREE.SpriteMaterial({
            map: haloTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.95
        });
        this.coreHalo = new THREE.Sprite(haloMat);
        this.coreHalo.scale.set(13, 13, 1);
        this.coreSphere.add(this.coreHalo);

        this.coreSphere.visible = false;
        this.spiralGroup.add(this.coreSphere);
    }

    initPhotoModal() {
        const photoModal = document.getElementById('photoModal');
        const closePhotoBtn = document.getElementById('closePhotoBtn');

        if (closePhotoBtn && photoModal) {
            closePhotoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                photoModal.classList.remove('active');
            });
        }
    }

    preloadUserPhoto() {
        const photoImg = document.getElementById('photoImg');
        const photoCaption = document.getElementById('photoCaption');

        if (photoImg) photoImg.src = './photo.jpg';
        if (photoCaption) photoCaption.textContent = 'больше фото не было, аххахаха';
    }

    openPhotoModal() {
        const photoModal = document.getElementById('photoModal');
        this.preloadUserPhoto(this.currentUser);

        if (photoModal) {
            photoModal.classList.add('active');
        }
    }

    async init() {
        this.initGateScreen();
        this.initPhotoModal();
        this.populateBgPattern();
        this.initStars();
        this.rebuildHeartPoints();
        this.initSaturnRing();
        this.initCentralCore();

        window.addEventListener('resize', () => this.onWindowResize());
        this.bindEvents();

        // Fetch Cloud Server State
        await this.fetchServerState();

        if (this.isAdmin) {
            this.bindAdminEvents();
        } else {
            setInterval(() => this.fetchServerState(), 1500);
        }

        // Render loop
        requestAnimationFrame((t) => this.render(t));
    }

    createGlowingTextTexture(text, colorStr) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 512, 128);
        ctx.font = 'bold 52px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = colorStr;
        ctx.shadowBlur = 26;
        ctx.fillStyle = colorStr;
        ctx.fillText(text, 256, 64);

        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    rebuildHeartPoints() {
        while (this.spiralGroup.children.length > 0) {
            const obj = this.spiralGroup.children[0];
            this.spiralGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }

        this.spiralElements = [];
        const count = this.density;
        const phi = (1 + Math.sqrt(5)) / 2;

        const zFar = -350;
        const zNear = 65;

        for (let i = 0; i < count; i++) {
            // 1. Upright 3D Heart Coordinates (hx, hy, hz)
            const tParam = (2 * Math.PI * i) / phi;
            const yParam = 1 - (i / (count - 1)) * 2;

            const sinU = Math.sin(tParam);
            const cosU = Math.cos(tParam);

            const hx = 16 * Math.pow(sinU, 3);
            const hy = (13 * cosU - 5 * Math.cos(2 * tParam) - 2 * Math.cos(3 * tParam) - Math.cos(4 * tParam));

            const thickness = Math.cos(yParam * Math.PI * 0.5);

            const heartX = hx * thickness * 1.35;
            const heartY = hy * thickness * 1.35;
            const heartZ = yParam * 12 * Math.abs(sinU);

            // 2. Conical Spiral Tunnel Coordinates (sx, sy, sz)
            const norm = i / count;
            const z = zFar + norm * (zNear - zFar);

            const theta = i * 0.35;
            const radiusNorm = (z - zFar) / (zNear - zFar);
            const radius = 3 + Math.pow(radiusNorm, 1.3) * 38;

            const x = radius * Math.cos(theta);
            const y = radius * Math.sin(theta);

            const phrase = this.phrases[i % this.phrases.length];
            const color = this.magentaPalette[i % this.magentaPalette.length];

            const texture = this.createGlowingTextTexture(phrase, color);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const sprite = new THREE.Sprite(material);
            const scale = 1.2 + radiusNorm * 2.8;
            sprite.scale.set(scale * 8, scale * 2, 1);
            sprite.position.set(x, y, z);

            this.spiralGroup.add(sprite);

            this.spiralElements.push({
                sprite,
                theta,
                baseZ: z,
                hx: heartX, hy: heartY, hz: heartZ,
                sx: x, sy: y, sz: z,
                phrase,
                color
            });
        }
    }

    initStars() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 300;
        const posArray = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            posArray[i] = (Math.random() - 0.5) * 400;
            posArray[i + 1] = (Math.random() - 0.5) * 400;
            posArray[i + 2] = (Math.random() - 0.5) * 500;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.2,
            transparent: true,
            opacity: 0.75
        });

        this.starParticles = new THREE.Points(starGeo, starMat);
        this.scene.add(this.starParticles);
    }

    createSparkTexture(colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, colorHex || '#ff1493');
        grad.addColorStop(1, 'rgba(255, 20, 147, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    triggerParticleBurst(clientX, clientY) {
        // Strict Condition: Trigger ONLY when access is granted AND mode is 3D Heart
        if (!this.isAccessGranted || this.modeState !== 'heart') return;

        // 1. Calculate normalized device coordinates [-1, 1]
        this.mouseVec.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(clientY / window.innerHeight) * 2 + 1;

        // 2. Raycast to Z=0 plane
        this.raycaster.setFromCamera(this.mouseVec, this.camera);
        const targetPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.planeZ0, targetPoint);

        // 3. Create particle burst group (20 sparkling particles)
        const burstGroup = new THREE.Group();
        burstGroup.position.copy(targetPoint);

        const particleCount = 20;
        const particles = [];
        const colors = ["#ff1493", "#ff007f", "#ff4d8d", "#ffffff", "#ff80ab"];

        for (let i = 0; i < particleCount; i++) {
            const color = colors[i % colors.length];
            const texture = this.createSparkTexture(color);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.95
            });

            const sprite = new THREE.Sprite(material);
            const initialScale = 2.2 + Math.random() * 2.2;
            sprite.scale.set(initialScale, initialScale, 1);

            // 3D Velocity outwards
            const speed = 0.3 + Math.random() * 0.75;
            const angle = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI * 0.8;

            const vx = speed * Math.cos(angle) * Math.cos(phi);
            const vy = speed * Math.sin(angle) * Math.cos(phi);
            const vz = speed * Math.sin(phi);

            sprite.position.set(0, 0, 0);
            burstGroup.add(sprite);

            particles.push({
                sprite,
                vx, vy, vz,
                initialScale,
                initialOpacity: 0.95
            });
        }

        this.scene.add(burstGroup);
        this.activeBursts.push({
            group: burstGroup,
            particles,
            startTime: performance.now(),
            duration: 1200 // 1.2s lifetime
        });
    }

    checkCoreSphereClick(clientX, clientY) {
        if (this.modeState !== 'heart' || !this.coreSphere || !this.coreSphere.visible) return false;

        this.mouseVec.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouseVec, this.camera);
        const intersects = this.raycaster.intersectObject(this.coreSphere, true);

        if (intersects.length > 0) {
            this.openPhotoModal();
            return true;
        }
        return false;
    }

    bindEvents() {
        // Mouse Parallax & Drag Rotation
        window.addEventListener('mousemove', (e) => {
            this.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;

            if (this.isDragging && this.modeState === 'heart') {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;

                this.heartRotationY += deltaX * 0.008;
                this.heartRotationX += deltaY * 0.008;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });

        // Mouse Wheel Zoom for 3D Heart
        window.addEventListener('wheel', (e) => {
            if (e.target.closest('#controlsPanel') || e.target.closest('#photoModal')) return;
            e.preventDefault();

            this.zoom += e.deltaY * 0.05;
            this.zoom = Math.min(Math.max(25, this.zoom), 140);
        }, { passive: false });

        // Click handler: Start warp transition, open Photo Modal, or trigger Particle Burst
        window.addEventListener('click', (e) => {
            if (!this.isAccessGranted) return;
            if (e.target.closest('#controlsPanel') || e.target.closest('#gateScreen') || e.target.closest('#photoModal')) return;

            if (this.modeState === 'spiral') {
                this.startWarpTransition(performance.now());
            } else if (this.modeState === 'heart') {
                const hitCore = this.checkCoreSphereClick(e.clientX, e.clientY);
                if (!hitCore) {
                    this.triggerParticleBurst(e.clientX, e.clientY);
                }
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (!this.isAccessGranted) return;
            if (e.target.closest('#controlsPanel') || e.target.closest('#gateScreen') || e.target.closest('#photoModal')) return;
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        // Touch handling with Pinch-Zoom & Particle Burst for Mobile
        let initialTouchDist = null;

        window.addEventListener('touchstart', (e) => {
            if (!this.isAccessGranted) return;
            if (e.target.closest('#controlsPanel') || e.target.closest('#gateScreen') || e.target.closest('#photoModal')) return;

            if (this.modeState === 'spiral') {
                this.startWarpTransition(performance.now());
            } else if (this.modeState === 'heart' && e.touches.length === 1) {
                const hitCore = this.checkCoreSphereClick(e.touches[0].clientX, e.touches[0].clientY);
                if (!hitCore) {
                    this.triggerParticleBurst(e.touches[0].clientX, e.touches[0].clientY);
                }
            }

            if (e.touches.length === 1) {
                this.isDragging = true;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                initialTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.isAccessGranted) return;
            if (e.touches.length === 2 && initialTouchDist) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = dist - initialTouchDist;
                this.zoom -= delta * 0.15;
                this.zoom = Math.min(Math.max(25, this.zoom), 140);
                initialTouchDist = dist;
                return;
            }

            if (!this.isDragging || e.touches.length !== 1) return;
            const deltaX = e.touches[0].clientX - this.lastMouseX;
            const deltaY = e.touches[0].clientY - this.lastMouseY;

            this.heartRotationY += deltaX * 0.008;
            this.heartRotationX += deltaY * 0.008;

            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
            initialTouchDist = null;
        });
    }

    startWarpTransition(timestamp) {
        if (this.modeState === 'spiral') {
            this.modeState = 'warp';
            this.warpStartTime = timestamp || performance.now();
        }
    }

    resetToSpiral() {
        this.modeState = 'spiral';
        this.heartRotationX = 0;
        this.heartRotationY = 0;
        this.zoom = 70;
        this.spiralGroup.rotation.x = 0;
        this.spiralGroup.rotation.y = 0;
        this.spiralGroup.rotation.z = 0;

        const zFar = -350;
        const zNear = 65;

        for (let i = 0; i < this.spiralElements.length; i++) {
            const el = this.spiralElements[i];
            const norm = i / this.spiralElements.length;
            const z = zFar + norm * (zNear - zFar);

            const theta = el.theta;
            const radiusNorm = (z - zFar) / (zNear - zFar);
            const radius = 3 + Math.pow(radiusNorm, 1.3) * 38;

            el.sprite.position.set(radius * Math.cos(theta), radius * Math.sin(theta), z);
            const scale = 1.2 + radiusNorm * 2.8;
            el.sprite.scale.set(scale * 8, scale * 2, 1);
        }
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        this.camera.aspect = aspect;
        this.camera.fov = aspect < 1 ? 72 : 60;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.populateBgPattern();
    }

    async fetchServerState() {
        try {
            const res = await fetch('/api/state?t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                this.applyStatePayload(data);
            }
        } catch (e) {
            console.warn("Could not fetch server state:", e);
        }
    }

    async pushServerState() {
        const payload = this.getStatePayload();
        try {
            await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("Could not push server state:", e);
        }
    }

    getStatePayload() {
        return {
            t: this.displayText,
            c: this.colorTheme,
            s: this.rotationSpeed,
            d: this.density,
            st: this.showStars,
            a: this.audioEnabled
        };
    }

    applyStatePayload(payload) {
        if (payload.t !== undefined && payload.t !== this.displayText) {
            this.displayText = payload.t;
            this.updateAllSpriteTextures();
        }
        if (payload.c !== undefined && payload.c !== this.colorTheme) {
            this.colorTheme = payload.c;
            if (this.isAdmin) this.updateColorPresetUI();
        }
        if (payload.s !== undefined) this.rotationSpeed = payload.s;
        if (payload.st !== undefined) {
            this.showStars = payload.st;
            if (this.starParticles) this.starParticles.visible = this.showStars;
        }
        if (payload.a !== undefined) this.audioEnabled = payload.a;

        if (this.isAdmin) {
            this.syncAdminUI();
        }
    }

    updateAllSpriteTextures() {
        this.spiralElements.forEach((el) => {
            const textToUse = (this.displayText && this.displayText !== "i love you") ? this.displayText : el.phrase;
            el.sprite.material.map = this.createGlowingTextTexture(textToUse, el.color);
            el.sprite.material.needsUpdate = true;
        });
    }

    updateColorPresetUI() {
        document.querySelectorAll('.color-preset').forEach(btn => {
            if (btn.getAttribute('data-color') === this.colorTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    syncAdminUI() {
        const textInput = document.getElementById('textInput');
        const speedRange = document.getElementById('speedRange');
        const speedVal = document.getElementById('speedVal');
        const densityRange = document.getElementById('densityRange');
        const densityVal = document.getElementById('densityVal');
        const starsToggle = document.getElementById('starsToggle');
        const audioToggle = document.getElementById('audioToggle');

        if (textInput && document.activeElement !== textInput) textInput.value = this.displayText;
        if (speedRange) speedRange.value = this.rotationSpeed;
        if (speedVal) speedVal.textContent = `${this.rotationSpeed.toFixed(1)}x`;
        if (densityRange) densityRange.value = this.density;
        if (densityVal) densityVal.textContent = this.density;
        if (starsToggle) starsToggle.checked = this.showStars;
        if (audioToggle) audioToggle.checked = this.audioEnabled;

        this.updateColorPresetUI();
    }

    bindAdminEvents() {
        const textInput = document.getElementById('textInput');
        const speedRange = document.getElementById('speedRange');
        const speedVal = document.getElementById('speedVal');
        const densityRange = document.getElementById('densityRange');
        const densityVal = document.getElementById('densityVal');
        const starsToggle = document.getElementById('starsToggle');
        const audioToggle = document.getElementById('audioToggle');
        const openViewerBtn = document.getElementById('openViewerBtn');
        const copyShareUrlBtn = document.getElementById('copyShareUrlBtn');
        const resetSpiralBtn = document.getElementById('resetSpiralBtn');
        const togglePanelBtn = document.getElementById('togglePanelBtn');
        const controlsPanel = document.getElementById('controlsPanel');
        const statusBadge = document.getElementById('statusBadge');

        if (statusBadge) {
            statusBadge.innerHTML = "🟢 Облачная синхронизация активна";
        }

        this.syncAdminUI();

        textInput.addEventListener('input', (e) => {
            this.displayText = e.target.value || "i love you";
            this.updateAllSpriteTextures();
            this.pushServerState();
        });

        speedRange.addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
            speedVal.textContent = `${this.rotationSpeed.toFixed(1)}x`;
            this.pushServerState();
        });

        densityRange.addEventListener('input', (e) => {
            this.density = parseInt(e.target.value);
            densityVal.textContent = this.density;
            this.rebuildHeartPoints();
            this.pushServerState();
        });

        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.colorTheme = btn.getAttribute('data-color');
                this.pushServerState();
            });
        });

        starsToggle.addEventListener('change', (e) => {
            this.showStars = e.target.checked;
            if (this.starParticles) this.starParticles.visible = this.showStars;
            this.pushServerState();
        });

        audioToggle.addEventListener('change', (e) => {
            this.audioEnabled = e.target.checked;
            this.pushServerState();
            if (this.audioEnabled && !this.audioCtx) {
                this.initAudio();
            }
        });

        if (resetSpiralBtn) {
            resetSpiralBtn.addEventListener('click', () => {
                this.resetToSpiral();
            });
        }

        if (openViewerBtn) {
            openViewerBtn.addEventListener('click', () => {
                window.open('/', '_blank');
            });
        }

        if (copyShareUrlBtn) {
            copyShareUrlBtn.addEventListener('click', () => {
                const shareUrl = window.location.origin + '/';
                navigator.clipboard.writeText(shareUrl).then(() => {
                    const origText = copyShareUrlBtn.textContent;
                    copyShareUrlBtn.textContent = "✅ Ссылка скопирована!";
                    setTimeout(() => {
                        copyShareUrlBtn.textContent = origText;
                    }, 2000);
                }).catch(() => {
                    prompt("Ссылка на сайт:", shareUrl);
                });
            });
        }

        if (togglePanelBtn) {
            togglePanelBtn.addEventListener('click', () => {
                controlsPanel.classList.toggle('collapsed');
            });
        }
    }

    initAudio() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.audioCtx = new AudioContext();
        }
    }

    playHeartbeatSound() {
        if (!this.audioCtx || this.audioCtx.state === 'suspended') {
            if (this.audioCtx) this.audioCtx.resume();
            return;
        }

        const now = this.audioCtx.currentTime;

        const playThud = (delay, freq) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + delay);
            osc.frequency.exponentialRampToValueAtTime(30, now + delay + 0.15);

            gain.gain.setValueAtTime(0.3, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now + delay);
            osc.stop(now + delay + 0.16);
        };

        playThud(0, 75);
        playThud(0.14, 60);
    }

    render(timestamp) {
        // 1. Smooth Camera Z Zoom
        this.camera.position.z += (this.zoom - this.camera.position.z) * 0.08;

        // 2. Mouse Parallax Camera Tracking (Dampened on mobile to keep spiral centered)
        if (this.modeState === 'spiral') {
            this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
            this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;
            const isMobile = window.innerWidth < 600;
            const mult = isMobile ? 3 : 12;
            this.camera.position.x = this.mouseX * mult;
            this.camera.position.y = this.mouseY * mult;
            this.camera.lookAt(0, 0, 0);
        } else {
            this.camera.position.x += (0 - this.camera.position.x) * 0.05;
            this.camera.position.y += (0 - this.camera.position.y) * 0.05;
            this.camera.lookAt(0, 0, 0);
        }

        // 3. Dynamic Animation Modes
        const zFar = -350;
        const zNear = 65;

        if (this.modeState === 'spiral') {
            if (this.saturnRingGroup) this.saturnRingGroup.visible = false;
            if (this.coreSphere) this.coreSphere.visible = false;

            this.spiralGroup.rotation.x = 0;
            this.spiralGroup.rotation.y = 0;
            this.spiralGroup.rotation.z += 0.005 * this.rotationSpeed;

            for (let i = 0; i < this.spiralElements.length; i++) {
                const el = this.spiralElements[i];
                const pos = el.sprite.position;

                pos.z += 1.2 * this.rotationSpeed;

                if (pos.z > zNear) {
                    pos.z = zFar;
                }

                const radiusNorm = Math.max(0, (pos.z - zFar) / (zNear - zFar));
                const radius = 3 + Math.pow(radiusNorm, 1.3) * 38;

                pos.x = radius * Math.cos(el.theta);
                pos.y = radius * Math.sin(el.theta);

                const scale = 1.2 + radiusNorm * 2.8;
                el.sprite.scale.set(scale * 8, scale * 2, 1);
            }
        } else if (this.modeState === 'warp') {
            if (this.saturnRingGroup) this.saturnRingGroup.visible = false;
            if (this.coreSphere) this.coreSphere.visible = false;

            const elapsed = timestamp - this.warpStartTime;
            const progress = Math.min(1, elapsed / this.warpDuration);

            this.spiralGroup.rotation.z += 0.015 * this.rotationSpeed;

            if (progress < 0.45) {
                const p1 = progress / 0.45;
                for (let i = 0; i < this.spiralElements.length; i++) {
                    const el = this.spiralElements[i];
                    el.sprite.position.z += (3 + p1 * 10) * this.rotationSpeed;
                }
            } else {
                const p2 = (progress - 0.45) / 0.55;
                const easeP2 = p2 < 0.5 ? 4 * p2 * p2 * p2 : 1 - Math.pow(-2 * p2 + 2, 3) / 2;

                this.spiralGroup.rotation.x = (1 - easeP2) * 0 + easeP2 * this.heartRotationX;
                this.spiralGroup.rotation.y = (1 - easeP2) * 0 + easeP2 * this.heartRotationY;
                this.spiralGroup.rotation.z = (1 - easeP2) * this.spiralGroup.rotation.z;

                for (let i = 0; i < this.spiralElements.length; i++) {
                    const el = this.spiralElements[i];
                    const pos = el.sprite.position;

                    pos.x += (el.hx - pos.x) * easeP2 * 0.25;
                    pos.y += (el.hy - pos.y) * easeP2 * 0.25;
                    pos.z += (el.hz - pos.z) * easeP2 * 0.25;

                    const targetScaleX = 5.2;
                    const targetScaleY = 1.3;
                    const curScaleX = el.sprite.scale.x;
                    const curScaleY = el.sprite.scale.y;

                    el.sprite.scale.set(
                        curScaleX + (targetScaleX - curScaleX) * easeP2 * 0.25,
                        curScaleY + (targetScaleY - curScaleY) * easeP2 * 0.25,
                        1
                    );
                }
            }

            if (progress >= 1) {
                this.modeState = 'heart';
                this.spiralGroup.rotation.z = 0;
            }
        } else if (this.modeState === 'heart') {
            // Show & Animate Secret Panoramic Text Carousel and Glowing Central Core
            if (this.saturnRingGroup) {
                this.saturnRingGroup.visible = true;
                this.saturnRingGroup.rotation.y += 0.002;
            }

            if (this.coreSphere) {
                this.coreSphere.visible = true;
                const corePulse = 1 + Math.sin(timestamp * 0.005) * 0.18;
                this.coreSphere.scale.set(corePulse, corePulse, corePulse);
            }

            this.spiralGroup.rotation.x = this.heartRotationX;
            this.spiralGroup.rotation.y = this.heartRotationY;
            this.spiralGroup.rotation.z = 0;

            const beatCycle = (timestamp * 0.003) % (Math.PI * 2);
            const beatPulse = Math.pow(Math.sin(beatCycle), 8) * 0.14;
            const heartScale = 1 + beatPulse;

            for (let i = 0; i < this.spiralElements.length; i++) {
                const el = this.spiralElements[i];
                el.sprite.position.set(el.hx * heartScale, el.hy * heartScale, el.hz * heartScale);
                el.sprite.scale.set(5.2, 1.3, 1);
            }

            if (this.audioEnabled && beatPulse > 0.12 && timestamp - this.lastBeatTime > 600) {
                this.playHeartbeatSound();
                this.lastBeatTime = timestamp;
            }
        }

        // Update & Render Active Particle Bursts with Memory Cleanup
        for (let b = this.activeBursts.length - 1; b >= 0; b--) {
            const burst = this.activeBursts[b];
            const elapsed = timestamp - burst.startTime;
            const progress = elapsed / burst.duration;

            if (progress >= 1) {
                // Disposal / Memory Cleanup: release textures & materials, remove group
                burst.particles.forEach(p => {
                    if (p.sprite.material.map) p.sprite.material.map.dispose();
                    p.sprite.material.dispose();
                });
                this.scene.remove(burst.group);
                this.activeBursts.splice(b, 1);
            } else {
                const fadeProgress = Math.pow(progress, 0.7);
                burst.particles.forEach(p => {
                    p.sprite.position.x += p.vx;
                    p.sprite.position.y += p.vy;
                    p.sprite.position.z += p.vz;

                    p.vx *= 0.94;
                    p.vy *= 0.94;
                    p.vz *= 0.94;

                    p.sprite.material.opacity = (1 - fadeProgress) * p.initialOpacity;
                    const curScale = (1 - progress * 0.6) * p.initialScale;
                    p.sprite.scale.set(curScale, curScale, 1);
                });
            }
        }

        // Render Three.js scene
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame((t) => this.render(t));
    }
}

// Instantiate engine when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.heartApp = new ThreeHeartEngine();
});
