'use strict'

const net = require('net')
const PORT = 50001
const ADDRESS = '127.0.0.1'

class TestServer {
  constructor() {
    if (!this.server) {
      this.server = net.createServer(this.onClientConnected)
    }
  }

  start() {
    this.server.listen(PORT, ADDRESS)
  }

  stop() {
    this.server.close()
  }

  onClientConnected(socket) {
    socket.on('data', (data) => {
      const message = data.toString().replace(/[\n\r]*$/, '')
      socket.write(message)
    })

    socket.on('end', () => {})
  }
}

module.exports = TestServer
