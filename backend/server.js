const mqtt = require('mqtt')

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
  clientId: 'aquasystem-naivasha-' + Math.random().toString(16).substr(2,8)
})

mqttClient.on('connect', () => {
  console.log('✅ MQTT Connected to broker.emqx.io')
// Subscribe to all Atmo topics
  mqttClient.subscribe('atmo/#')
  mqttClient.subscribe('aquasystem/#')
})

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString())
    console.log(`MQTT ${topic}:`, data)
    if(topic === 'atmo/pump1' || topic.includes('pump1')) liveSensors.pump1 = data
    if(topic === 'atmo/pump2' || topic.includes('pump2')) liveSensors.pump2 = data
    if(topic.includes('tank')) liveSensors.tankLevel = data.level || data
    if(topic.includes('cip')) liveSensors.cip = data
    liveSensors.lastUpdate = new Date().toISOString()
  } catch(e){
    console.log('Raw MQTT', topic, message.toString())
  }
})

mqttClient.on('error', (e) => console.log('MQTT Error', e))

// EXPRESS API
const express = require('express')
const cors = require('cors')
const app = express()
app.use(cors({ origin: "*" }))
app.use(express.json())

app.get('/', (req,res) => res.send('AquaSystem Backend Running'))
app.get('/api/pumps/status', (req,res)=> res.json(liveSensors))

const PORT = 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Running on http://0.0.0.0:${PORT}`)
})