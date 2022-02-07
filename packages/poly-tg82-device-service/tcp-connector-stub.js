class TcpConnectorStub {
  constructor(address, port) {
    this.address = address
    this.port = port
    this.connected = true
    this.write = this._write.bind(this)
    this.onData = this._onData.bind(this)
    this.callbackMap = new Map()

    this.getVersionCommand = '<tg82><get><version> </version></get></tg82>'
    this.getVersionReturn =
      '<tg82><my><version><hw>0</hw><app>2.92</app><xml>1.18 / 1.84 / 1.04</xml><release>006.102_20210223</release><os>1.32</os><logic>20</logic><web>1.99</web><webapp>1.66</webapp><radio_conf>2.16</radio_conf><xml_disp>2.02</xml_disp><scoring>4.18</scoring><rotary_1>-.--</rotary_1><rotary_2>-.--</rotary_2></version></my></tg82>'
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

  _write(command, address) {
    console.log(
      'TcpConnectorStub would send message',
      command,
      'to address',
      this.address
    )

    this._mapCommandToData(command)
    return 1
  }

  _onData(callback) {
    this.callbackMap.set('data', callback)
  }

  _mapCommandToData(command) {
    if (command === this.getVersionCommand) {
      this._executeCallback('data', this.getVersionReturn)
    } else {
      this._executeCallback('data', command)
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TcpConnectorStub
}
