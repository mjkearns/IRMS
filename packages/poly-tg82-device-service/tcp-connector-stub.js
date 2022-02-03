class TcpConnectorStub {
  constructor(address, port) {
    this.address = address
    this.port = port
    this.connected = true
    this.write = this._write.bind(this)
  }

  _write(command, address) {
    console.log(
      'TcpConnectorStub would send message',
      command,
      'to address',
      this.address
    )
    return 1
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TcpConnectorStub
}
