class TcpConnectorStub {
  constructor() {
    this.sendCommand = this._sendCommand.bind(this)
  }

  _sendCommand(command, address) {
    console.log(
      'TcpConnectorStub would send message',
      command,
      'to address',
      address
    )
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TcpConnectorStub
}
