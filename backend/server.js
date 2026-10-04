const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();

// 1. CORS: allow your real Vercel domain, any *.vercel.app preview, and local dev
const ALLOWED_ORIGINS = [
  'https://aquasystem-project.vercel.app',
  'http://atmo.co.ke',
  'http://www.atmo.co.ke',
  'http://localhost:3000',
  'http://localhost:5173'
];
const VERCEL_PATTERN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    // No origin = curl / server-to-server / direct browser visit
    if (!origin || ALLOWED_ORIGINS.includes(origin) || VERCEL_PATTERN.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false); // blocked: no CORS headers sent
  },
  methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json());

// 2. Live sensor data
let liveSensors = {
  pump1: { status: 'OFF', pressure: 0, flow: 0 },
  pump2: { status: 'OFF', pressure: 0, flow: 0 },
  tankLevel: 0,
  cip: { cycle: 'CIP-01', status: 'IDLE' },
  lastUpdate: new Date().toISOString()
};

// Fallback simulator: mock data if no real MQTT traffic for 10s
let lastMqttMessage = Date.now();
setInterval(() => {
  if (Date.now() - lastMqttMessage > 10000 && liveSensors.pump1.status === 'OFF') {
    liveSensors.pump1 = {
      status: 'Running',
      pressure: parseFloat((8 + Math.random()).toFixed(1)),
      flow: 340 + Math.floor(Math.random() * 40)
    };
    liveSensors.tankLevel = 60 + Math.floor(Math.random() * 15);
    liveSensors.lastUpdate = new Date().toISOString();
  }
}, 5000);

// 3. MQTT over secure WebSocket
const DEVICE_TOPIC = '069107032F4002485/#';
const mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
  clientId: 'atmo-' + Math.random().toString(16).slice(2, 8),
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 4000
});

mqttClient.on('connect', () => {
  console.log('MQTT Connected via WSS');
  mqttClient.subscribe(['atmo/#', DEVICE_TOPIC], (err) => {
    if (!err) console.log(`Subscribed to atmo/# and ${DEVICE_TOPIC}`);
  });
});

mqttClient.on('error', (e) => console.log('MQTT Error:', e.message));
mqttClient.on('offline', () => console.log('MQTT Offline - retrying'));
mqttClient.on('reconnect', () => console.log('MQTT Reconnecting...'));

mqttClient.on('message', (topic, msg) => {
  const raw = message.toString().trim();
  let parsed = null;
  try {
    const rawString = msg.toString();
    console.log(`MQTT Received [${topic}]:`, rawString);
    lastMqttMessage = Date.now();

    let data;
    try {

      0}
    if (raw.startsWith('{')) {
      parsed = JSON.parse(raw);
    } 
    // 2. If it's HEX like in your screenshot
    else if (/^[0-9A-Fa-f\s]+$/.test(raw.replace(/\s/g,''))) {
      const hex = raw.replace(/\s/g,'');
      const ascii = Buffer.from(hex, 'hex').toString('utf-8');
      console.log("HEX decoded ->", ascii);
      
      try {
        parsed = JSON.parse(ascii); // maybe ascii is JSON
      } catch {
        // If not JSON, try to extract numbers manually
        // Example: your hex contains pressure/flow hidden
        parsed = { 
          status: "Running", 
          rawAscii: ascii.substring(0, 100), // first 100 chars
          pressure: 8.5, // we will parse real values next
          flow: 343 
        };
      }
    }
  } catch (e) {
    console.log("Parse error:", raw.substring(0,50));
  }

  if (parsed) {
    // Update your pump data
    if (topic.includes('pump1')) pump1 = { ...pump1, ...parsed, lastUpdate: new Date().toISOString() };
    if (topic.includes('pump2')) pump2 = { ...pump2, ...parsed };
    console.log("Updated:", topic, parsed);
  }
});
    
    if (topic.includes('tank')) {
      liveSensors.tankLevel =
        data.level !== undefined ? data.level :
        data.value !== undefined ? data.value : data;
    }
    if (topic.includes('cip')) {
      liveSensors.cip = data;
    }
    liveSensors.lastUpdate = new Date().toISOString();
  } catch (e) {
    console.log('MQTT message handling error:', e.message);
  }
});

// 4. Routes
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    backend: 'OK',
    message: 'ATMO Backend Operating normally',
    mqtt: mqttClient.connected ? 'WSS Connected' : 'WSS Disconnected',
    device: DEVICE_TOPIC
  });
});

app.get('/api/pumps/status', (req, res) => {
  res.json(liveSensors);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: Math.floor(process.uptime()) + 's',
    lastMqttInteraction: new Date(lastMqttMessage).toISOString()
  });
});

// 5. Start server (Render provides PORT)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ATMO Industrial Backend hosted on port ${PORT}`);
});
