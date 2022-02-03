class TcpConnectorStub {
  constructor(test) {
    this.test = test || false
    this.connected = true
    this.sendCommand = this._sendCommand.bind(this)
  }

  _sendCommand(command, address) {
    if (this.test) {
      console.log(
        'TcpConnectorStub would send message',
        command,
        'to address',
        address
      )
    }
    return 1
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TcpConnectorStub
}
