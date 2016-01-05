var Meta = require('./index.js')
var swarm = require('webrtc-swarm')
window.localStorage.debug = 'meta-swarm'

var m = new Meta(swarm, ['localhost:7000'], {
  events: ['connect']
})

m.on('connect', function () { console.log(arguments) })
window.m = m
