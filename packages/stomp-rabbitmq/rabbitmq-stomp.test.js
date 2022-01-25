const RabbitmqStomp = require('./rabbitmq-stomp.js')

describe('connections', () => {
  it('exists', async () => {
    const instance = await new RabbitmqStomp()
    expect(instance).toBeDefined()
    expect(instance.connect).toBeDefined()
    expect(instance.disconnect).toBeDefined()
    expect(instance.publish).toBeDefined()
    expect(instance.subscribe).toBeDefined()
  })

  it('fail to connect to invalid host', async () => {
    const instance = await new RabbitmqStomp('invalid host')
    expect(instance.lastError).not.toBeNull()
  })

  it('gracefully disconnect from invalid connection', async () => {
    const instance = await new RabbitmqStomp('invalid host')
    const disconnect = await instance.disconnect()
    expect(disconnect).toBe(true)
    expect(instance.lastError).not.toBeNull()
  })

  it('connect succesfully', async () => {
    const instance = await new RabbitmqStomp('localhost:15674')
    expect(instance.connected).toBe(true)
  })

  it('disconnect succesfully', async () => {
    const instance = await new RabbitmqStomp('localhost:15674')
    const disconnect = await instance.disconnect()
    expect(disconnect).toBe(true)
  })
})

describe('producers', () => {
  let instance

  beforeEach(async () => {
    instance = await new RabbitmqStomp('localhost:15674')
  })

  afterEach(async () => {
    await instance.disconnect()
  })

  it('publish string', () => {
    const str = 'HELLO WORLD'
    const ok = instance.publish('amq.topic', 'example.topic', str)
    expect(ok).toBe(true)
  })

  it('publish object', () => {
    const obj = {
      data: 'HELLO WORLD',
      data2: 1234
    }
    const ok = instance.publish('amq.topic', 'example.topic', obj)
    expect(ok).toBe(true)
  })

  it('publish binary', () => {
    const bin = new Uint8Array([0x00, 0xff, 0x10, 0x20, 0x30, 0x40, 0x50])
    const ok = instance.publish('amq.topic', 'example.topic', bin)
    expect(ok).toBe(true)
  })
})

describe('consumers', () => {
  let instance

  beforeEach(async () => {
    instance = await new RabbitmqStomp('localhost:15674')
  })

  afterEach(async () => {
    await instance.disconnect()
  })

  it('subscribe', () => {
    const sub = instance.subscribe('amq.topic', 'example.topic', () => {})
    expect(sub.id).toBeDefined()
    expect(sub.unsubscribe).toBeDefined()
  })

  it('receive string', async (done) => {
    const str = 'Test Message'
    instance.subscribe('amq.topic', 'example.topic', (message) => {
      expect(message).toBe(str)
      done()
    })
    instance.publish('amq.topic', 'example.topic', str)
  })

  it('receive object', async (done) => {
    const obj = {
      data: 'HELLO WORLD',
      data2: 1234
    }
    instance.subscribe('amq.topic', 'example.topic', (message) => {
      expect(message).toEqual({ data: obj })
      done()
    })
    instance.publish('amq.topic', 'example.topic', {
      data: obj
    })
  })

  it('receive binary', async (done) => {
    const bin = new Uint8Array([0x00, 0xff, 0x10, 0x20, 0x30, 0x40, 0x50])

    instance.subscribe('amq.topic', 'example.topic', (message) => {
      expect(message).toEqual(bin)
      done()
    })
    instance.publish('amq.topic', 'example.topic', bin)
  })

  it('receive on wildcard subscription', async (done) => {
    instance.subscribe('amq.topic', 'example.*', (message) => {
      expect(message).toBe('Test Message')
      done()
    })
    instance.publish('amq.topic', 'example.topic', 'Test Message')
  })
})
