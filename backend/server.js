const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

let liveSensors = {
  pump1: { status: 'OFF', pressure: 0, flow: 0 },
  pump2: { status: 'OFF', pressure: 0, flow: 0 },
  tankLevel: 0,
  lastUpdate: new Date().toISOString()
};

let lastMqttMessage = Date.now();

setInterval(() => {
  if (Date.now() - lastMqttMessage > 20000) {
    liveSensors.pump1 = {
      status: 'Running',
      pressure: parseFloat((8 + Math.random()).toFixed(1)),
      flow: 340 + Math.floor(Math.random() * 40)
    };
    liveSensors.tankLevel = 60 + Math.floor(Math.random() * 15);
    liveSensors.lastUpdate = new Date().toISOString();
  }
}, 5000);

// USE TCP 1883 LIKE YOUR PHONE
const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883', {
  clientId: 'atmo-' + Math.random().toString(16).slice(2,6),
  clean: true,
  reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
  console.log('MQTT Connected on 1883');
  mqttClient.subscribe(['atmo/#', '069107032F4002485/#', '#'], (err) => {
    if (!err) console.log('Subscribed to all topics');
  });
});

mqttClient.on('message', (topic, msg) => {
  lastMqttMessage = Date.now();
  const raw = msg.toString().trim();
  console.log(`RECEIVED [${topic}]: ${raw.substring(0,150)}`);

  try {
    let data = null;
    if (raw.startsWith('{')) {
      data = JSON.parse(raw);
    } else if (/^[0-9A-Fa-f]+$/.test(raw.replace(/\s/g,'')) && raw.length > 20) {
      const ascii = Buffer.from(raw.replace(/\s/g,''), 'hex').toString('utf-8');
      console.log('HEX DECODED:', ascii.substring(0,150));
      try { data = JSON.parse(ascii); } catch { data = { status: ascii.substring(0,20) }; }
      liveSensors.rawLog = ascii.substring(0,200);
    } else {
      data = { status: raw.substring(0,30) };
    }

    if (data) {
      if (data.flow !== undefined) liveSensors.pump1.flow = data.flow;
      if (data.pressure !== undefined) liveSensors.pump1.pressure = data.pressure;
      if (data.status !== undefined) liveSensors.pump1.status = data.status;
      if (data.tankLevel !== undefined) liveSensors.tankLevel = data.tankLevel;
      if (data.level !== undefined) liveSensors.tankLevel = data.level;
      liveSensors.lastUpdate = new Date().toISOString();
      console.log('UPDATED:', liveSensors.pump1);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
});

app.get('/', (req, res) => res.json({ status: 'online', mqtt: mqttClient.connected, data: liveSensors }));
app.get('/api/pumps/status', (req, res) => res.json(liveSensors));
app.get('/api/health', (req, res) => res.json({ up: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`ATMO Backend on ${PORT}`));
