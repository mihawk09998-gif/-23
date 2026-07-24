// Programmed Love - 3D Heart Engine with Cloud Server API Live Sync

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

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initStars();
        this.rebuildHeartPoints();
        this.bindCanvasControls();

        // 1. Load state from Cloud Server
        await this.fetchServerState();

        if (this.isAdmin) {
            this.bindAdminEvents();
        } else {
            // Polling for live updates on viewers/phones
            setInterval(() => this.fetchServerState(), 1500);
        }

        // Start animation loop
        requestAnimationFrame((t) => this.render(t));
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
        let densityChanged = false;

        if (payload.t !== undefined && payload.t !== this.displayText) {
            this.displayText = payload.t;
        }
        if (payload.c !== undefined && payload.c !== this.colorTheme) {
            this.colorTheme = payload.c;
            if (this.isAdmin) this.updateColorPresetUI();
        }
        if (payload.s !== undefined) this.rotationSpeed = payload.s;
        if (payload.st !== undefined) this.showStars = payload.st;
        if (payload.a !== undefined) this.audioEnabled = payload.a;
        if (payload.d !== undefined && payload.d !== this.density) {
            this.density = payload.d;
            densityChanged = true;
        }

        if (densityChanged) {
            this.rebuildHeartPoints();
        }

        if (this.isAdmin) {
            this.syncAdminUI();
        }
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
        const statusBadge = document.getElementById('statusBadge');

        if (statusBadge) {
            statusBadge.innerHTML = "🟢 Облачная синхронизация активна";
        }

        this.syncAdminUI();

        // Text input change
        textInput.addEventListener('input', (e) => {
            this.displayText = e.target.value || "i love you";
            this.pushServerState();
        });

        // Speed slider
        speedRange.addEventListener('input', (e) => {
            this.rotationSpeed = parseFloat(e.target.value);
            speedVal.textContent = `${this.rotationSpeed.toFixed(1)}x`;
            this.pushServerState();
        });

        // Density slider
        densityRange.addEventListener('input', (e) => {
            this.density = parseInt(e.target.value);
            densityVal.textContent = this.density;
            this.rebuildHeartPoints();
            this.pushServerState();
        });

        // Color Presets
        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.colorTheme = btn.getAttribute('data-color');
                this.pushServerState();
            });
        });

        // Toggles
        starsToggle.addEventListener('change', (e) => {
            this.showStars = e.target.checked;
            this.pushServerState();
        });

        audioToggle.addEventListener('change', (e) => {
            this.audioEnabled = e.target.checked;
            this.pushServerState();
            if (this.audioEnabled && !this.audioCtx) {
                this.initAudio();
            }
        });

        // Open Viewer Window
        if (openViewerBtn) {
            openViewerBtn.addEventListener('click', () => {
                window.open('/', '_blank');
            });
        }

        // Copy Share URL for Phone
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
