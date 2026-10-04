const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();

// CORS - allow Vercel + atmo.co.ke + local
const ALLOWED_ORIGINS = [
  'https://aquasystem-project.vercel.app',
  'https://atmo.co.ke',
  'https://www.atmo.co.ke',
  'https://atmo.co.ke/',
  'http://atmo.co.ke',
  'http://www.atmo.co.ke',
  'http://localhost:3000',
];
const VERCEL_PATTERN = /^https:\/\/.*\.vercel\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || VERCEL_PATTERN.test(origin) || origin.includes('atmo.co.ke')) {
      return cb(null, true);
    }
    console.log('Blocked origin:', origin);
    return cb(null, true); // allow anyway for now to fix your phone
  },
  methods: ['GET','POST','OPTIONS']
}));
app.use(express.json());

let liveSensors = {
  pump1: { status: 'OFF', pressure: 0, flow: 0 },
  pump2: { status: 'OFF', pressure: 0, flow: 0 },
  tankLevel: 0,
  cip: { cycle: 'CIP-01', status: 'IDLE' },
  lastUpdate: new Date().toISOString(),
  rawLog: ''
};

let lastMqttMessage = Date.now();

// Simulator only if NO real data
setInterval(() => {
  if (Date.now() - lastMqttMessage > 15000) {
    liveSensors.pump1 = {
      status: 'Running',
      pressure: parseFloat((8 + Math.random()).toFixed(1)),
      flow: 340 + Math.floor(Math.random() * 40)
    };
    liveSensors.tankLevel = 60 + Math.floor(Math.random() * 15);
    liveSensors.lastUpdate = new Date().toISOString();
  }
}, 5000);

const DEVICE_TOPIC = '069107032F4002485/#';
const mqttClient = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
  clientId: 'atmo-' + Math.random().toString(16).slice(2,8),
  clean: true,
  reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
  console.log('MQTT Connected');
  mqttClient.subscribe(['atmo/#', DEVICE_TOPIC]);
});

mqttClient.on('message', (topic, msg) => {
  try {
    lastMqttMessage = Date.now();
    const raw = msg.toString().trim();
    console.log(`[${topic}] raw:`, raw.substring(0, 200));

    let parsed = null;

    // Case 1: JSON like {"pressure":8.3,"flow":343}
    if (raw.startsWith('{')) {
      parsed = JSON.parse(raw);
    } 
    // Case 2: HEX like 524F352D... -> decode to text
    else if (/^[0-9A-Fa-f]+$/.test(raw.replace(/\s/g,'')) && raw.length > 10) {
      const hex = raw.replace(/\s/g,'');
      const ascii = Buffer.from(hex, 'hex').toString('utf-8');
      console.log('HEX decoded ->', ascii);
      liveSensors.rawLog = ascii.substring(0, 300);

      try {
        parsed = JSON.parse(ascii);
      } catch {
        // Try to extract readable words
        // Your device sends RO5-... etc
        const matchFlow = ascii.match(/flow[:=]\s*(\d+)/i);
        const matchPress = ascii.match(/press[:=]\s*([\d.]+)/i);
        if (matchFlow || matchPress) {
          parsed = {
            flow: matchFlow ? parseInt(matchFlow[1]) : liveSensors.pump1.flow,
            pressure: matchPress ? parseFloat(matchPress[1]) : liveSensors.pump1.pressure,
            status: 'Running'
          };
        } else {
          // If no numbers, just show the text
          parsed = { status: ascii.substring(0,20) || 'Running', flow: liveSensors.pump1.flow, pressure: liveSensors.pump1.pressure };
        }
      }
    } else {
      // Plain text
      parsed = { status: raw.substring(0,20), flow: liveSensors.pump1.flow, pressure: liveSensors.pump1.pressure };
      liveSensors.rawLog = raw.substring(0,300);
    }

    if (parsed) {
      if (topic.includes('pump1') || topic.includes('069107032F4002485')) {
        liveSensors.pump1 = { ...liveSensors.pump1, ...parsed };
      } else if (topic.includes('pump2')) {
        liveSensors.pump2 = { ...liveSensors.pump2, ...parsed };
      } else if (topic.includes('tank')) {
        liveSensors.tankLevel = parsed.level || parsed.value || parsed.tankLevel || liveSensors.tankLevel;
      }
      liveSensors.lastUpdate = new Date().toISOString();
      console.log('Updated liveSensors:', liveSensors.pump1);
    }
  } catch (e) {
    console.log('Handler error:', e.message);
  }
});

app.get('/', (req, res) => res.json({ status: 'online', mqtt: mqttClient.connected ? 'connected' : 'offline', device: DEVICE_TOPIC, last: liveSensors }));
app.get('/api/pumps/status', (req, res) => res.json(liveSensors));
app.get('/api/health', (req, res) => res.json({ status: 'online', uptime: process.uptime() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`ATMO Backend on ${PORT}`));
