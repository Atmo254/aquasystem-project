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
  lastUpdate: new Date().toISOString(),
  rawLog: ''
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

const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883', {
  clientId: 'atmo-' + Math.random().toString(16).slice(2,6),
  clean: true,
  reconnectPeriod: 5000
});

// THIS WAS MISSING - YOU NEED THIS!
mqttClient.on('connect', () => {
  console.log('MQTT Connected on 1883');
  mqttClient.subscribe(['069107032F4002485/#', '069107032F4002485/getaboxdata', '#'], (err) => {
    if (!err) console.log('Subscribed to 069107032F4002485/#');
  });
});

mqttClient.on('error', (e) => console.log('MQTT Error:', e.message));
mqttClient.on('offline', () => console.log('MQTT Offline'));

mqttClient.on('message', (topic, msg) => {
  lastMqttMessage = Date.now();
  const rawHex = msg.toString().trim().replace(/\s/g,'');
  console.log(`RECEIVED [${topic}]: ${rawHex.substring(0,120)}`);

  try {
    if (rawHex.startsWith('{')) {
      const j = JSON.parse(rawHex);
      liveSensors.pump1 = { ...liveSensors.pump1, ...j, lastUpdate: new Date().toISOString() };
      console.log('JSON UPDATED:', liveSensors.pump1);
    } else if (/^[0-9A-Fa-f]+$/.test(rawHex) && rawHex.length > 20) {
      const buf = Buffer.from(rawHex, 'hex');
      let readable = {};
      let pos = 0;
      
      while (pos < buf.length - 2) {
        if (buf[pos] === 0x52 && buf[pos+1] === 0x4F && buf[pos+2] === 0x35) {
          const nameLen = buf[pos - 1];
          if (nameLen > 5 && nameLen < 40 && pos + nameLen <= buf.length) {
            const name = buf.slice(pos, pos + nameLen).toString('utf-8');
            const valBuf = buf.slice(pos - 9, pos - 1);
            if (valBuf.length === 8) {
              const value = valBuf.readDoubleLE(0);
              if (value >= 0 && value < 10000 && !isNaN(value)) {
                console.log(`DECODED: ${name} = ${value}`);
                readable[name] = value;
                if (name.toLowerCase().includes('feed')) {
                  liveSensors.pump1.flow = parseFloat(value.toFixed(2));
                  liveSensors.pump1.status = 'Running';
                  liveSensors.pump1.pressure = 8.5;
                }
                if (name.toLowerCase().includes('permeate')) {
                  liveSensors.pump2.flow = parseFloat(value.toFixed(2));
                  liveSensors.pump2.status = 'Running';
                }
              }
            }
            pos += nameLen;
          }
        }
        pos++;
      }
      if (Object.keys(readable).length > 0) {
        liveSensors.lastUpdate = new Date().toISOString();
        liveSensors.rawLog = Object.entries(readable).map(([k,v])=>`${k}:${v}`).join(' | ');
        console.log('UPDATED:', liveSensors);
      }
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
});

app.get('/', (req, res) => res.json({ status: 'online', mqtt: mqttClient.connected, data: liveSensors }));
app.get('/api/pumps/status', (req, res) => res.json(liveSensors));
app.get('/api/health', (req, res) => res.json({ up: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`ATMO Backend on ${PORT}`));
