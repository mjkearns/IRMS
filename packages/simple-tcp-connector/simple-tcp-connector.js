const net = require('net')

class SimpleTcpConnector {
  constructor(address, port) {
    this.config = {
      address,
      port
    }
    this.socket = net.Socket()
    this.socket.setEncoding('utf8')
    this.callbackMap = new Map()

    this.socket.on('connect', () => {
      this._executeCallback('connect')
    })

    this.socket.on('data', (dataBuffer) => {
      this._executeCallback('data', dataBuffer)
    })

    this.socket.on('end', () => {
      this._executeCallback('end')
    })

    this.socket.on('error', () => {
      this._executeCallback('error')
    })
  }

  _executeCallback(key, data) {
    if (this.callbackMap.has(key)) {
      if (data) {
        this.callbackMap.get(key)(data)
      } else {
        this.callbackMap.get(key)()
      }
    }
  }

  _setCallback(key, callback) {
    this.callbackMap.set(key, callback)
  }

  connect() {
    this.socket.connect(this.config.port, this.config.address)
  }

  disconnect() {
    this.socket.end()
  }

  keepAlive(idleTimeMs) {
    this.socket.setKeepAlive(true, idleTimeMs)
  }

  write(dataString) {
    this.socket.write(dataString)
  }

  onConnect(callback) {
    this._setCallback('connect', callback)
  }

  onData(callback) {
    this._setCallback('data', callback)
  }

  onError(callback) {
    this._setCallback('error', callback)
  }

  onDisconnect(callback) {
    this._setCallback('end', callback)
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimpleTcpConnector
}
