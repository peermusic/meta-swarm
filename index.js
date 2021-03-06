var debug = require('debug')('meta-swarm')
var events = require('events')
var inherits = require('inherits')
var signalhub = require('signalhub')

inherits(Meta, events.EventEmitter)
module.exports = Meta

function Meta (swarm, urls, opts) {
  if (!swarm) throw new Error('Need a `webrtc-swarm`-like function.')
  if (!(this instanceof Meta)) return new Meta(opts)
  if (!opts) opts = {}

  this.events = opts.events || []
  this.urls = urls || []
  this.namespace = opts.namespace || 'meta-swarm'
  this.opts = opts || {}
  this.swarm = swarm

  this.peers = {}
  this.swarms = {}

  if (this.urls.length !== 0) {
    this._init()
  }
}

Meta.prototype._init = function () {
  var self = this
  self.urls.forEach(function (url) {
    debug('connecting to signalhub', url)
    self._connect(url)
  })
}

Meta.prototype._connect = function (url) {
  var self = this

  var hub = signalhub(self.namespace, [url])
  var sw

  if (this.opts.keyPair) sw = self.swarm(hub, this.opts.keyPair, this.opts)
  else sw = self.swarm(hub, this.opts)

  this.events.forEach(function (event) {
    sw.on(event, function () {
      var args = Array.prototype.slice.call(arguments)
      args.unshift(event)
      debug(args)
      self.emit.apply(null, args)
    })
  })

  sw.on('accept', function (id, sharedSignPubKey) {
    self.emit('accept', id, sharedSignPubKey)
  })
  sw.on('connect', function (peer, id) {
    self.emit('connect', peer, id)
    self.on('send', function (data) {
      peer.send(data)
    })
    peer.on('data', function (data) {
      self.emit('data', data, id)
    })
    self.peers[id] = peer
  })
  sw.on('disconnect', function (peer, id) {
    self.emit('disconnect', peer, id)
    delete self.peers[id]
  })

  this.swarms[url] = sw
  return sw
}

Meta.prototype.addPeer = function (peerId) {
  Object.keys(this.swarms).forEach((hubUrl) => {
    var swarm = this.swarms[hubUrl]
    if (swarm.whitelist.indexOf(peerId) !== -1) return
    swarm.whitelist.push(peerId)
  })
}

Meta.prototype.removePeer = function (peerId) {
  Object.keys(this.swarms).forEach((hubUrl) => {
    var swarm = this.swarms[hubUrl]
    var index = swarm.whitelist.indexOf(peerId)
    if (index === -1) return
    swarm.whitelist.splice(index, 1)
  })
}

Meta.prototype.addHub = function (url) {
  if (this.swarms[url]) return
  this._connect(url)
}

Meta.prototype.send = function (data, id) {
  if (id) this.peers[id].send(data)
  else this.emit('send', data)
}
