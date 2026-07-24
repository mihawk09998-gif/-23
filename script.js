// Programmed Love - 3D Heart Engine with WebRTC & URL Parameter Sync

class HeartEngine {
    constructor() {
        this.canvas = document.getElementById('heartCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isAdmin = document.body.classList.contains('mode-admin');

        // Default State
        this.displayText = "i love you";
        this.colorTheme = "#ff4d8d";
        this.rotationSpeed = 1.0;
        this.density = 450;
        this.showStars = true;
        this.audioEnabled = false;

        // PeerJS P2P Room ID
        this.roomId = 'salih-3d-heart-room-v1';
        this.peer = null;
        this.connections = [];

        // Load state: priority URL Params > LocalStorage > Defaults
        this.loadSettings();

        // 3D View Camera State
        this.angleX = 0.2;
        this.angleY = 0;
        this.zoom = 18;
        this.basePerspective = 600;

        // Interaction
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Data arrays
        this.points = [];
        this.stars = [];
        this.time = 0;

        // Web Audio Context
        this.audioCtx = null;
        this.lastBeatTime = 0;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initStars();
        this.rebuildHeartPoints();
        this.bindCanvasControls();

        if (this.isAdmin) {
            this.bindAdminEvents();
            this.initAdminP2PHost();
        } else {
            this.initViewerP2PClient();
        }

        this.listenForStorageChanges();

        // Start animation loop
        requestAnimationFrame((t) => this.render(t));
    }

    loadSettings() {
        // 1. Check URL Parameters first
        const urlParams = new URLSearchParams(window.location.search);

        let hasUrlParam = false;
        if (urlParams.has('t')) { this.displayText = urlParams.get('t'); hasUrlParam = true; }
        if (urlParams.has('c')) { this.colorTheme = urlParams.get('c'); hasUrlParam = true; }
        if (urlParams.has('s')) { this.rotationSpeed = parseFloat(urlParams.get('s')); hasUrlParam = true; }
        if (urlParams.has('d')) { this.density = parseInt(urlParams.get('d')); hasUrlParam = true; }
        if (urlParams.has('st')) { this.showStars = urlParams.get('st') === '1'; hasUrlParam = true; }

        if (hasUrlParam) return;

        // 2. Fallback to localStorage
        try {
            const savedText = localStorage.getItem('heart_text');
            if (savedText) this.displayText = savedText;

            const savedColor = localStorage.getItem('heart_color');
            if (savedColor) this.colorTheme = savedColor;

            const savedSpeed = localStorage.getItem('heart_speed');
            if (savedSpeed) this.rotationSpeed = parseFloat(savedSpeed);

            const savedDensity = localStorage.getItem('heart_density');
            if (savedDensity) this.density = parseInt(savedDensity);

            const savedStars = localStorage.getItem('heart_stars');
            if (savedStars !== null) this.showStars = savedStars === 'true';

            const savedAudio = localStorage.getItem('heart_audio');
            if (savedAudio !== null) this.audioEnabled = savedAudio === 'true';
        } catch (e) {
            console.warn("LocalStorage access error:", e);
        }
    }

    saveSetting(key, val) {
        try {
            localStorage.setItem(key, val);
        } catch (e) {
            console.warn("LocalStorage save error:", e);
        }
        this.broadcastStateToPeers();
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
        if (payload.t !== undefined) this.displayText = payload.t;
        if (payload.c !== undefined) this.colorTheme = payload.c;
        if (payload.s !== undefined) this.rotationSpeed = payload.s;
        if (payload.st !== undefined) this.showStars = payload.st;
        if (payload.a !== undefined) this.audioEnabled = payload.a;
        if (payload.d !== undefined && payload.d !== this.density) {
            this.density = payload.d;
            this.rebuildHeartPoints();
        }
    }

    // WebRTC PeerJS Admin Host Setup
    initAdminP2PHost() {
        if (typeof Peer === 'undefined') return;

        const badge = document.getElementById('statusBadge');

        try {
            this.peer = new Peer(this.roomId);

            this.peer.on('open', (id) => {
                if (badge) badge.innerHTML = `🌐 Онлайн-комната открыта | Подключено устройств: 0`;
            });

            this.peer.on('connection', (conn) => {
                this.connections.push(conn);
                if (badge) badge.innerHTML = `🟢 Онлайн-комната активна | Подключено устройств: ${this.connections.length}`;

                conn.on('open', () => {
                    conn.send(this.getStatePayload());
                });

                conn.on('close', () => {
                    this.connections = this.connections.filter(c => c !== conn);
                    if (badge) badge.innerHTML = `🟢 Онлайн-комната активна | Подключено устройств: ${this.connections.length}`;
                });
            });

            this.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    // Host already active elsewhere
                    if (badge) badge.innerHTML = `⚡ Подключено к активной админ-сессии`;
                }
            });
        } catch (e) {
            console.warn("PeerJS init error:", e);
        }
    }

    // WebRTC PeerJS Viewer Client Setup
    initViewerP2PClient() {
        if (typeof Peer === 'undefined') return;

        try {
            this.peer = new Peer();

            this.peer.on('open', () => {
                const conn = this.peer.connect(this.roomId);

                conn.on('open', () => {
                    console.log("Connected to Admin P2P Host");
                });

                conn.on('data', (data) => {
                    this.applyStatePayload(data);
                });
            });
        } catch (e) {
            console.warn("PeerJS client error:", e);
        }
    }

    broadcastStateToPeers() {
        const payload = this.getStatePayload();
        this.connections.forEach(conn => {
            if (conn.open) {
                conn.send(payload);
            }
        });
    }

    listenForStorageChanges() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'heart_text') this.displayText = e.newValue || "i love you";
            if (e.key === 'heart_color') this.colorTheme = e.newValue || "#ff4d8d";
            if (e.key === 'heart_speed') this.rotationSpeed = parseFloat(e.newValue || 1.0);
            if (e.key === 'heart_stars') this.showStars = e.newValue === 'true';
            if (e.key === 'heart_audio') this.audioEnabled = e.newValue === 'true';
            if (e.key === 'heart_density') {
                this.density = parseInt(e.newValue || 450);
                this.rebuildHeartPoints();
            }

            if (this.isAdmin) {
                this.syncAdminUI();
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

        if (textInput) textInput.value = this.displayText;
        if (speedRange) speedRange.value = this.rotationSpeed;
        if (speedVal) speedVal.textContent = `${this.rotationSpeed.toFixed(1)}x`;
        if (densityRange) densityRange.value = this.density;
        if (densityVal) densityVal.textContent = this.density;
        if (starsToggle) starsToggle.checked = this.showStars;
        if (audioToggle) audioToggle.checked = this.audioEnabled;

        document.querySelectorAll('.color-preset').forEach(btn => {
            if (btn.getAttribute('data-color') === this.colorTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * this.width * 2,
                y: (Math.random() - 0.5) * this.height * 2,
                z: Math.random() * 1000,
                size: Math.random() * 1.8 + 0.5,
                alpha: Math.random() * 0.8 + 0.2
            });
        }
    }

    rebuildHeartPoints() {
        this.points = [];
        const count = this.density;
        const phi = (1 + Math.sqrt(5)) / 2;

        for (let i = 0; i < count; i++) {
            const t = (2 * Math.PI * i) / phi;
            const yParam = 1 - (i / (count - 1)) * 2;

            const u = t; 
            const sinU = Math.sin(u);
            const cosU = Math.cos(u);

            const hx = 16 * Math.pow(sinU, 3);
            const hy = -(13 * cosU - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u));

            const thickness = Math.cos(yParam * Math.PI * 0.5);
            const x = hx * thickness;
            const y = hy * thickness;
            const z = yParam * 14 * Math.abs(sinU);

            const fontSize = Math.floor(Math.random() * 6) + 12;
            const hueOffset = (i / count) * 360;

            this.points.push({
                x, y, z,
                fontSize,
                hueOffset
            });
        }
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
        const togglePanelBtn = document.getElementById('togglePanelBtn');
        const controlsPanel = document.getElementById('controlsPanel');

        this.syncAdminUI();

        // Text input change
        textInput.addEventListener('input', (e) => {
            this.displayText = e.target.value || "i love you";
            this.saveSetting('heart_text', this.displayText);
        });

        // Speed slider
        speedRange.addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
            speedVal.textContent = `${this.rotationSpeed.toFixed(1)}x`;
            this.saveSetting('heart_speed', this.rotationSpeed);
        });

        // Density slider
        densityRange.addEventListener('input', (e) => {
            this.density = parseInt(e.target.value);
            densityVal.textContent = this.density;
            this.rebuildHeartPoints();
            this.saveSetting('heart_density', this.density);
        });

        // Color Presets
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.colorTheme = btn.getAttribute('data-color');
                this.saveSetting('heart_color', this.colorTheme);
            });
        });

        // Toggles
        starsToggle.addEventListener('change', (e) => {
            this.showStars = e.target.checked;
            this.saveSetting('heart_stars', this.showStars);
        });

        audioToggle.addEventListener('change', (e) => {
            this.audioEnabled = e.target.checked;
            this.saveSetting('heart_audio', this.audioEnabled);
            if (this.audioEnabled && !this.audioCtx) {
                this.initAudio();
            }
        });

        // Open Viewer Window
        if (openViewerBtn) {
            openViewerBtn.addEventListener('click', () => {
                window.open('index.html', '_blank');
            });
        }

        // Copy Share URL for Phone
        if (copyShareUrlBtn) {
            copyShareUrlBtn.addEventListener('click', () => {
                const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', '') + 'index.html';
                const shareUrl = `${baseUrl}?t=${encodeURIComponent(this.displayText)}&c=${encodeURIComponent(this.colorTheme)}&s=${this.rotationSpeed}&d=${this.density}&st=${this.showStars ? 1 : 0}`;

                navigator.clipboard.writeText(shareUrl).then(() => {
                    const origText = copyShareUrlBtn.textContent;
                    copyShareUrlBtn.textContent = "✅ Ссылка скопирована!";
                    setTimeout(() => {
                        copyShareUrlBtn.textContent = origText;
                    }, 2000);
                }).catch(() => {
                    prompt("Скопируйте ссылку для телефона:", shareUrl);
                });
            });
        }

        // Collapse Panel
        if (togglePanelBtn) {
            togglePanelBtn.addEventListener('click', () => {
                controlsPanel.classList.toggle('collapsed');
            });
        }
    }

    bindCanvasControls() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;

            this.angleY += deltaX * 0.008;
            this.angleX += deltaY * 0.008;

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        let initialTouchDist = null;

        this.canvas.addEventListener('touchstart', (e) => {
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
            if (e.touches.length === 2 && initialTouchDist) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = dist - initialTouchDist;
                this.zoom += delta * 0.05;
                this.zoom = Math.min(Math.max(8, this.zoom), 35);
                initialTouchDist = dist;
                return;
            }

            if (!this.isDragging || e.touches.length !== 1) return;
            const deltaX = e.touches[0].clientX - this.lastMouseX;
            const deltaY = e.touches[0].clientY - this.lastMouseY;

            this.angleY += deltaX * 0.008;
            this.angleX += deltaY * 0.008;

            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
            initialTouchDist = null;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom += e.deltaY * -0.015;
            this.zoom = Math.min(Math.max(8, this.zoom), 35);
        }, { passive: false });
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
        this.time += 0.015 * this.rotationSpeed;

        if (!this.isDragging) {
            this.angleY += 0.006 * this.rotationSpeed;
        }

        const beatCycle = (timestamp * 0.003) % (Math.PI * 2);
        const beatPulse = Math.pow(Math.sin(beatCycle), 8) * 0.18 + (Math.sin(beatCycle * 2) > 0.5 ? 0.05 : 0);
        const currentScale = this.zoom * (1 + beatPulse);

        if (this.audioEnabled && beatPulse > 0.15 && timestamp - this.lastBeatTime > 600) {
            this.playHeartbeatSound();
            this.lastBeatTime = timestamp;
        }

        this.ctx.fillStyle = "#05050a";
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (this.showStars) {
            this.renderStars();
        }

        this.renderHeart(currentScale);

        requestAnimationFrame((t) => this.render(t));
    }

    renderStars() {
        this.ctx.save();
        this.stars.forEach(star => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(
                (star.x + this.width / 2) % this.width,
                (star.y + this.height / 2) % this.height,
                star.size,
                0, Math.PI * 2
            );
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    renderHeart(currentScale) {
        const cosX = Math.cos(this.angleX);
        const sinX = Math.sin(this.angleX);
        const cosY = Math.cos(this.angleY);
        const sinY = Math.sin(this.angleY);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        const projected = [];

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];

            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.x * sinY + p.z * cosY;
            let y1 = p.y;

            let y2 = y1 * cosX - z1 * sinX;
            let z2 = y1 * sinX + z1 * cosX;
            let x2 = x1;

            const distance = this.basePerspective;
            const fov = distance / (distance + z2);

            const sx = centerX + x2 * currentScale * fov;
            const sy = centerY + y2 * currentScale * fov;

            let colorStr = this.colorTheme;
            if (this.colorTheme === "rainbow") {
                colorStr = `hsl(${(p.hueOffset + this.time * 50) % 360}, 90%, 65%)`;
            }

            const alpha = Math.min(1, Math.max(0.2, (z2 + 300) / 600));

            projected.push({
                sx, sy, z: z2, fov,
                fontSize: p.fontSize * fov,
                color: colorStr,
                alpha
            });
        }

        projected.sort((a, b) => b.z - a.z);

        this.ctx.save();
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        for (let i = 0; i < projected.length; i++) {
            const p = projected[i];

            this.ctx.font = `600 ${Math.max(8, p.fontSize)}px 'Outfit', sans-serif`;
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;

            if (p.z > 0) {
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = Math.min(15, p.fontSize * 0.8);
            } else {
                this.ctx.shadowBlur = 0;
            }

            this.ctx.fillText(this.displayText, p.sx, p.sy);
        }

        this.ctx.restore();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.heartApp = new HeartEngine();
});
