const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Prevent browser/CDN caching so mobile phone always gets updated files
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Global Server State for 3D Heart (Synced across all devices)
let currentHeartState = {
    t: "i love you",
    c: "#ff4d8d",
    s: 1.0,
    d: 450,
    st: true,
    a: false
};

// API Endpoint to fetch current state (Used by phones/viewers)
app.get('/api/state', (req, res) => {
    res.json(currentHeartState);
});

// API Endpoint to update state (Used by Admin panel)
app.post('/api/state', (req, res) => {
    if (req.body) {
        currentHeartState = { ...currentHeartState, ...req.body };
    }
    res.json({ success: true, state: currentHeartState });
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Route handlers
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
