const PolyTg82DeviceService = require('../poly-tg82-device-service')

describe('poly-tg82-device-service', () => {
  const upCommandBytes = new Uint8Array([10, 2, 1, 1, 18, 2, 1, 2])
  const downCommandBytes = new Uint8Array([10, 2, 2, 2, 18, 2, 1, 2])
  const getVersionReturn =
    '<tg82><my><version><hw>0</hw><app>2.92</app><xml>1.18 / 1.84 / 1.04</xml><release>006.102_20210223</release><os>1.32</os><logic>20</logic><web>1.99</web><webapp>1.66</webapp><radio_conf>2.16</radio_conf><xml_disp>2.02</xml_disp><scoring>4.18</scoring><rotary_1>-.--</rotary_1><rotary_2>-.--</rotary_2></version></my></tg82>'

  it('exists', async () => {
    const targetService = new PolyTg82DeviceService()
    expect(targetService).toBeDefined()
    expect(Object.keys(targetService.rabbitMqInstance).length).toBe(0)
    expect(Object.keys(targetService.tcpConnections).length).toBe(4)
    expect(Object.keys(targetService.tcpConnections.connections).length).toBe(0)
    expect(Object.keys(targetService.tcpConnections.status).length).toBe(0)
    expect(targetService.deviceIpMap).toBeDefined()
    expect(targetService.deviceCommands).toBeDefined()
    expect(targetService.onDataReceive).toBeDefined()
    expect(targetService.debugPublishMessage).toBeDefined()
  })
  it('creates', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    expect(targetService.rabbitMqInstance.connected).toBeDefined()
  })
  it('Parses valid message', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    targetService.onDataReceive(upCommandBytes)
    expect(targetService.data.transmits).toBe(6)
  })
  it('Rejects invalid message', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1])
    expect(targetService.onDataReceive(commandBytes)).toBe(false)
    expect(targetService.data.transmits).toBe(4)
  })
  it('Filters single bad ID', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 1, 1, 18, 2, 1, 8]) // Invalid ID = 8, only 4 registered in demo code
    expect(targetService.onDataReceive(commandBytes)).toBe(true)
    expect(targetService.data.transmits).toBe(5)
    expect(targetService.tcpConnections.lastRecvMessage[1]).toBe(
      targetService.deviceCommands[1].command
    )
    expect(targetService.tcpConnections.lastRecvMessage[2]).toBe(
      getVersionReturn
    )
  })
  it('Filters multiple bad ID', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 1, 1, 18, 2, 7, 8]) // 7 + 8 are invalid Ids
    expect(targetService.onDataReceive(commandBytes)).toBe(false)
    expect(targetService.data.transmits).toBe(4)
    expect(targetService.tcpConnections.lastRecvMessage[1]).toBe(
      getVersionReturn
    )
    expect(targetService.tcpConnections.lastRecvMessage[2]).toBe(
      getVersionReturn
    )
  })
  it('Filters single bad command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 1, 100, 18, 2, 1, 2]) // 7 + 8 are invalid Ids according to map containing 4 addresses
    expect(targetService.onDataReceive(commandBytes)).toBe(false)
    expect(targetService.data.transmits).toBe(5)
    expect(targetService.tcpConnections.lastRecvMessage[1]).toBe(
      targetService.deviceCommands[1].command
    )
    expect(targetService.tcpConnections.lastRecvMessage[2]).toBe(
      getVersionReturn
    )
  })
  it('Filters multiple bad command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 200, 100, 18, 2, 1, 2]) // 100 Results in setting 'Unknown', but 200 results in undefined
    expect(targetService.onDataReceive(commandBytes)).toBe(false)
    expect(targetService.data.transmits).toBe(4)
    expect(targetService.tcpConnections.lastRecvMessage[1]).toBe(
      getVersionReturn
    )
    expect(targetService.tcpConnections.lastRecvMessage[2]).toBe(
      getVersionReturn
    )
  })
  it('Sends up XML command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    expect(targetService.onDataReceive(upCommandBytes)).toBe(true)
    expect(targetService.data.transmits).toBe(6)
    expect(targetService.tcpConnections.lastRecvMessage[1]).toBe(
      targetService.deviceCommands[1].command
    )
    expect(targetService.tcpConnections.lastRecvMessage[2]).toBe(
      targetService.deviceCommands[1].command
    )
  })
  it('Sends down XML command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    expect(targetService.onDataReceive(downCommandBytes)).toBe(true)
    expect(targetService.data.transmits).toBe(6)
    expect(targetService.tcpConnections.lastRecvMessage[1]).toBe(
      targetService.deviceCommands[2].command
    )
    expect(targetService.tcpConnections.lastRecvMessage[2]).toBe(
      targetService.deviceCommands[2].command
    )
  })
  it('Sends get version', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    expect(targetService.tcpConnections.lastSendMessage[1]).toBe(
      targetService.getVersionCommand
    )
    expect(targetService.tcpConnections.lastSendMessage[2]).toBe(
      targetService.getVersionCommand
    )
    expect(targetService.tcpConnections.lastRecvMessage[1]).toBe(
      getVersionReturn
    )
    expect(targetService.tcpConnections.lastRecvMessage[2]).toBe(
      getVersionReturn
    )
  })
})
