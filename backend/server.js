const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// MQTT STORE - holds latest live values
let liveSensors = {
  pump1: { status: 'OFF', pressure: 0, flow: 0 },
  pump2: { status: 'OFF', pressure: 0, flow: 0 },
  tankLevel: 0,
  cip: { cycle: 'CIP-01', status: 'IDLE' },
  lastUpdate: new Date().toISOString()
}

// Connect to EMQX public broker
const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883', {
  clientId: 'aquasystem-naivasha-' + Math.random().toString(16).substring(2,8)
});

mqttClient.on('connect', () => {
  console.log('MQTT Connected to EMQX');
  mqttClient.subscribe('atmo/#');
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    // update store based on topic
    if(topic.includes('pump1')) liveSensors.pump1 = data;
    if(topic.includes('pump2')) liveSensors.pump2 = data;
    if(topic.includes('tank')) liveSensors.tankLevel = data.level || data;
    liveSensors.lastUpdate = new Date().toISOString();
  } catch(e){
    // if not JSON, just store raw
  }
});

// API ROUTES FOR FRONTEND
app.get('/', (req, res) => res.json({ status: 'ATMO Backend OK', liveSensors }));
app.get('/api/pumps/status', (req, res) => res.json(liveSensors));
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Use Render port
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ATMO Backend running on ${PORT}`);
});
