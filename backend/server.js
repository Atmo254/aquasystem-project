const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

let liveSensors = {
  pump1: { status: 'ON', pressure: 8.5, flow: 0 },
  pump2: { status: 'ON', pressure: 0, flow: 0 },
  tankLevel: 0,
  lastUpdate: new Date().toISOString(),
  rawLog: 'Waiting for RO5 data...',
  decoded: []
};

let lastMqttMessage = Date.now();

const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883', {
  clientId: 'atmo-' + Math.random().toString(16).slice(2,6),
  clean: true,
  reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
  console.log('MQTT Connected on 1883');
  mqttClient.subscribe('069107032F4002485/#', () => console.log('Subscribed to 069107032F4002485/#'));
});

mqttClient.on('message', (topic, msg) => {
  lastMqttMessage = Date.now();
  const rawHex = msg.toString().trim();
  console.log(`RECEIVED [${topic}]: ${rawHex.substring(0,100)}`);

  try {
    // Convert hex to readable text by keeping only A-Z a-z 0-9 / - .
    let readableText = "";
    for (let i = 0; i < rawHex.length; i += 2) {
      let byte = parseInt(rawHex.substr(i, 2), 16);
      if ((byte >= 32 && byte <= 126)) readableText += String.fromCharCode(byte);
      else readableText += " ";
    }
    readableText = readableText.replace(/\s+/g, ' ').trim();
    console.log(`READABLE: ${readableText}`);

    // Your device sends RO5-FEEDFlow -> we map to dashboard
    // For now, if we see FEED we set pump1 to Running with value 128 (example)
    // Next we will parse real double once you confirm value
    liveSensors.rawLog = readableText.substring(0, 200);
    liveSensors.decoded = readableText.match(/RO5[^ ]+/g) || [readableText];
    
    if (readableText.includes('FEED')) {
      liveSensors.pump1.status = 'Running';
      liveSensors.pump1.flow = 128; // from 6040... = 128 in your hex
      liveSensors.pump1.pressure = 6.5;
    }
    if (readableText.includes('m3')) {
      liveSensors.pump2.status = 'Running';
    }

    liveSensors.lastUpdate = new Date().toISOString();
    console.log('UPDATED DASHBOARD:', liveSensors.pump1, liveSensors.rawLog);
    
  } catch (e) {
    console.log('Error:', e.message);
  }
});

app.get('/', (req, res) => res.json({ status: 'online', mqtt: mqttClient.connected, data: liveSensors }));
app.get('/api/pumps/status', (req, res) => res.json(liveSensors));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`ATMO Backend on ${PORT}`));
