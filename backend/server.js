const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

let liveSensors = {
  feedFlow: 0, permeateFlow: 0, concentrateFlow: 0,
  roPressure: 0, interstagePress: 0, concentratePress: 0,
  feedTankLevel: 0, systemRecovery: 0, pureWaterEc: 0,
  pump1: { status: 'Waiting', pressure: 0, flow: 0 },
  pump2: { status: 'Waiting', pressure: 0, flow: 0 },
  tankLevel: 0, allValues: {},
  mqttStatus: 'Disconnected',
  lastUpdate: new Date().toISOString(),
  lastHex: ''
};

app.get('/api/pumps/status', (req, res) => res.json(liveSensors));
app.get('/', (req, res) => res.json({ status: 'online', mqtt: liveSensors.mqttStatus, data: liveSensors }));

// IMPORTANT: Start web server FIRST for Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ATMO Backend running on ${PORT}`);

  // START MQTT AFTER server is live
  const client = mqtt.connect('mqtt://broker.emqx.io:1883', {
    clientId: 'atmo-ro5-' + Date.now(),
    clean: true,
    keepalive: 30,
    reconnectPeriod: 3000,
    connectTimeout: 10000
  });

  client.on('connect', () => {
    console.log('==== MQTT CONNECTED TO broker.emqx.io:1883 ====');
    liveSensors.mqttStatus = 'Connected';
    // Subscribe to your exact ID + wildcard to debug
    client.subscribe('069107032F4002485/#', (err) => {
      if(err) console.log('Subscribe error', err);
      else console.log('Subscribed to 069107032F4002485/#');
    });
    client.subscribe('069107032F4002485', (err) => {
      console.log('Subscribed to root topic');
    });
  });

  client.on('error', (err) => {
    console.log('MQTT ERROR:', err.message);
    liveSensors.mqttStatus = 'Error: ' + err.message;
  });

  client.on('close', () => {
    console.log('MQTT CLOSED - reconnecting...');
    liveSensors.mqttStatus = 'Reconnecting...';
  });

  client.on('reconnect', () => {
    console.log('MQTT RECONNECTING...');
  });

  client.on('message', (topic, msg) => {
    console.log(`MQTT MESSAGE on ${topic} len=${msg.length}`);
    const hex = msg.toString().trim().replace(/\s/g,'');
    liveSensors.lastHex = hex.substring(0, 100) + '...';

    if (!/^[0-9A-Fa-f]+$/.test(hex) || hex.length < 20) {
      console.log('Not hex, raw:', msg.toString().substring(0,100));
      return;
    }

    try {
      const buf = Buffer.from(hex, 'hex');
      let pos = 0; let values = {};
      while (pos + 9 < buf.length) {
        let value;
        try { value = buf.readDoubleLE(pos); } catch { pos++; continue; }
        const lenPos = pos + 8;
        if (lenPos >= buf.length) break;
        const nameLen = buf[lenPos];
        if (nameLen >= 5 && nameLen <= 40 && lenPos + 1 + nameLen <= buf.length) {
          const nameStart = lenPos + 1;
          if (buf[nameStart] === 0x52) { // R
            const name = buf.slice(nameStart, nameStart + nameLen).toString('utf-8');
            if (name.includes('RO5-') &&!isNaN(value) && isFinite(value) && Math.abs(value) < 50000) {
              values[name] = parseFloat(value.toFixed(2));
              console.log(`DECODED: ${name} = ${value}`);
            }
            pos = nameStart + nameLen; continue;
          }
        }
        pos++;
      }

      if (Object.keys(values).length > 0) {
        const map = {
          'RO5-FEEDFlow m3/h': 'feedFlow',
          'RO5-Permeateflow M3/h': 'permeateFlow',
          'RO5-ConcetrateFlow M3/h': 'concentrateFlow',
          'RO5-ROPressure bar': 'roPressure',
          'RO5-InterstagePress bar': 'interstagePress',
          'RO5-ConcetratePress bar': 'concentratePress',
          'RO5-FeedTankLevel %': 'feedTankLevel',
          'RO5-SystemRecovery %': 'systemRecovery',
          'RO5-PureWaterEc S/m': 'pureWaterEc'
        };
        for (const [mqttName, dashName] of Object.entries(map)) {
          if (values[mqttName]!== undefined) liveSensors[dashName] = values[mqttName];
        }
        liveSensors.pump1.flow = liveSensors.feedFlow;
        liveSensors.pump1.pressure = liveSensors.roPressure;
        liveSensors.pump2.flow = liveSensors.permeateFlow;
        liveSensors.tankLevel = liveSensors.feedTankLevel;
        liveSensors.pump1.status = 'Running';
        liveSensors.allValues = values;
        liveSensors.lastUpdate = new Date().toISOString();
        liveSensors.mqttStatus = 'Live data';
        console.log('LIVE UPDATE:', liveSensors.feedFlow, liveSensors.permeateFlow);
      }
    } catch (e) { console.log('Parse error', e.message); }
  });
});
