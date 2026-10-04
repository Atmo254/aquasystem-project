const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

let liveSensors = {
  // Dashboard friendly names that match exactly
  feedFlow: 0, permeateFlow: 0, concentrateFlow: 0,
  roPressure: 0, interstagePress: 0, concentratePress: 0,
  stage1Delta: 0, stage2Delta: 0,
  mediaFilterInPress: 0, mediaFilterOutPress: 0, mediaFilterDeltaP: 0,
  systemRecovery: 0, pureWaterEc: 0, feedTankLevel: 0,
  antiscalantDoser: 0, antiscalantDaily: 0,
  // legacy for your current frontend
  pump1: { status: 'Running', pressure: 0, flow: 0 },
  pump2: { status: 'Running', pressure: 0, flow: 0 },
  tankLevel: 0,
  allValues: {}, // <-- keeps EXACT MQTT names
  lastUpdate: new Date().toISOString()
};

const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883', {
  clientId: 'atmo-' + Math.random().toString(16).slice(2,6),
  clean: true, reconnectPeriod: 5000
});

mqttClient.on('connect', () => {
  console.log('MQTT Connected on 1883');
  mqttClient.subscribe('069107032F4002485/#');
});

mqttClient.on('message', (topic, msg) => {
  const hex = msg.toString().trim().replace(/\s/g,'');
  if (!/^[0-9A-Fa-f]+$/.test(hex) || hex.length < 20) return;
  try {
    const buf = Buffer.from(hex, 'hex');
    let pos = 0; let values = {};
    while (pos + 9 < buf.length) {
      let value; try { value = buf.readDoubleLE(pos); } catch { pos++; continue; }
      const lenPos = pos + 8;
      if (lenPos >= buf.length) break;
      const nameLen = buf[lenPos];
      if (nameLen >= 5 && nameLen <= 35 && lenPos + 1 + nameLen <= buf.length) {
        const nameStart = lenPos + 1;
        if (buf[nameStart] === 0x52 && buf[nameStart+1] === 0x4F) { // RO
          const name = buf.slice(nameStart, nameStart + nameLen).toString('utf-8');
          if (!isNaN(value) && isFinite(value) && Math.abs(value) < 50000) {
            values[name] = parseFloat(value.toFixed(2));
            console.log(`DECODED: ${name} = ${value}`);
          }
          pos = nameStart + nameLen; continue;
        }
      }
      pos++;
    }

    if (Object.keys(values).length > 0) {
      // === EXACT MAPPING TO DASHBOARD ===
      const map = {
        'RO5-FEEDFlow m3/h': 'feedFlow',
        'RO5-Permeateflow M3/h': 'permeateFlow',
        'RO5-ConcetrateFlow M3/h': 'concentrateFlow',
        'RO5-ROPressure bar': 'roPressure',
        'RO5-InterstagePress bar': 'interstagePress',
        'RO5-ConcetratePress bar': 'concentratePress',
        'RO5-Stage1Delta bar': 'stage1Delta',
        'RO5-Stage2Delta bar': 'stage2Delta',
        'RO5-MediaFilterInPress bar': 'mediaFilterInPress',
        'RO5-MediaFilterOutPress bar': 'mediaFilterOutPress',
        'RO5-MediaFilterDeltaP bar': 'mediaFilterDeltaP',
        'RO5-SystemRecovery %': 'systemRecovery',
        'RO5-PureWaterEc S/m': 'pureWaterEc',
        'RO5-FeedTankLevel %': 'feedTankLevel',
        'RO5-AntiscalantDoser ml/hr': 'antiscalantDoser',
        'RO5-AntiscalantDaily ml': 'antiscalantDaily'
      };

      for (const [mqttName, dashName] of Object.entries(map)) {
        if (values[mqttName] !== undefined) liveSensors[dashName] = values[mqttName];
      }

      // Legacy compat
      liveSensors.pump1.flow = liveSensors.feedFlow;
      liveSensors.pump1.pressure = liveSensors.roPressure;
      liveSensors.pump2.flow = liveSensors.permeateFlow;
      liveSensors.tankLevel = liveSensors.feedTankLevel;
      liveSensors.allValues = values;
      liveSensors.lastUpdate = new Date().toISOString();

      console.log('MAPPED:', liveSensors);
    }
  } catch (e) { console.log(e.message); }
});

app.get('/api/pumps/status', (req, res) => res.json(liveSensors));
app.get('/', (req, res) => res.json({ status: 'online', mqtt: mqttClient.connected, data: liveSensors }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`ATMO on ${PORT}`));
