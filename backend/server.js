const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

let liveSensors = {
  pump1: { status: 'OFF', pressure: 0, flow: 0 },
  pump2: { status: 'OFF', pressure: 0, flow: 0 },
  tankLevel: 0,
  cip: { cycle: 'CIP-01', status: 'IDLE' },
  lastUpdate: new Date().toISOString()
};

// --- SELF SIMULATOR WHEN NO MQTT DATA ---
setInterval(() => {
  // If pump is OFF (no MQTT), simulate running data
  if(liveSensors.pump1.status === 'OFF' && liveSensors.pump1.pressure === 0){
    liveSensors.pump1 = { 
      status: 'Running', 
      pressure: (8 + Math.random()).toFixed(1), 
      flow: 340 + Math.floor(Math.random()*30) 
    };
    liveSensors.pump2 = { status: 'OFF', pressure: 0, flow: 0 };
    liveSensors.tankLevel = 60 + Math.floor(Math.random()*10);
    liveSensors.lastUpdate = new Date().toISOString();
  }
}, 5000);

// MQTT still connected for real hardware later
const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883');
mqttClient.on('connect', () => {
  console.log('MQTT Connected');
  mqttClient.subscribe('atmo/#');
});
mqttClient.on('message', (topic, msg) => {
  try{
    const data = JSON.parse(msg.toString());
    if(topic.includes('pump1')) liveSensors.pump1 = data;
    if(topic.includes('pump2')) liveSensors.pump2 = data;
    if(topic.includes('tank')) liveSensors.tankLevel = data.level || data;
    liveSensors.lastUpdate = new Date().toISOString();
  }catch(e){}
});

app.get('/', (req,res) => res.json({ message:'ATMO Backend OK' }));
app.get('/api/pumps/status', (req,res) => res.json(liveSensors));
app.get('/api/health', (req,res) => res.json({ status:'ok' }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log('ATMO Running on '+PORT));
