const PolyTg82DeviceService = require('../poly-tg82-device-service')

describe('poly-tg82-device-service', () => {
  const upCommandBytes = new Uint8Array([10, 2, 1, 1, 18, 2, 1, 2])
  const downCommandBytes = new Uint8Array([10, 2, 2, 2, 18, 2, 1, 2])

  it('exists', async () => {
    const targetService = new PolyTg82DeviceService()
    expect(targetService).toBeDefined()
    expect(Object.keys(targetService.rabbitMqInstance).length).toBe(0)
    expect(Object.keys(targetService.tcpConnections).length).toBe(2)
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
    expect(targetService.data.transmits).toBe(2)
  })
  it('Rejects invalid message', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1])
    expect(targetService.onDataReceive(commandBytes)).toBe(false)
    expect(targetService.data.transmits).toBe(0)
  })
  it('Filters single bad ID', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 1, 1, 18, 2, 1, 8]) // Invalid ID = 8, only 4 registered in demo code
    expect(targetService.onDataReceive(commandBytes)).toBe(true)
    expect(targetService.data.transmits).toBe(1)
  })
  it('Filters multiple bad ID', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 1, 1, 18, 2, 7, 8]) // 7 + 8 are invalid Ids
    expect(targetService.onDataReceive(commandBytes)).toBe(false)
    expect(targetService.data.transmits).toBe(0)
  })
  it('Filters single bad command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 1, 100, 18, 2, 1, 2]) // 7 + 8 are invalid Ids according to map containing 4 addresses
    expect(targetService.onDataReceive(commandBytes)).toBe(true)
    expect(targetService.data.transmits).toBe(1)
  })
  it('Filters multiple bad command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    const commandBytes = new Uint8Array([10, 2, 200, 100, 18, 2, 1, 2]) // 100 Results in setting 'Unknown', but 200 results in undefined
    expect(targetService.onDataReceive(commandBytes)).toBe(false)
    expect(targetService.data.transmits).toBe(0)
  })
  it('Sends up XML command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    expect(targetService.onDataReceive(upCommandBytes)).toBe(true)
    expect(targetService.data.transmits).toBe(2)
  })
  it('Sends down XML command', async () => {
    const targetService = await PolyTg82DeviceService.create({
      debug: false,
      test: true
    })
    expect(targetService.onDataReceive(downCommandBytes)).toBe(true)
    expect(targetService.data.transmits).toBe(2)
  })
})
