const RabbitmqStomp = require('./rabbitmq-stomp.js')

describe('connections', () => {
  it('exists', async () => {
    let instance = await new RabbitmqStomp()
    expect(instance).toBeDefined()
    expect(instance.connect).toBeDefined()
    expect(instance.disconnect).toBeDefined()
    expect(instance.publish).toBeDefined()
    expect(instance.subscribe).toBeDefined()
  })

  it('fail to connect to invalid host', async () => {
    let instance = await new RabbitmqStomp('invalid host')
    expect(instance.lastError).not.toBeNull()
  })

  it('gracefully disconnect from invalid connection', async () => {
    let instance = await new RabbitmqStomp('invalid host')
    let disconnect = await instance.disconnect()
    expect(disconnect).toBe(true)
    expect(instance.lastError).not.toBeNull()
  })

  it('connect succesfully', async () => {
    let instance = await new RabbitmqStomp('localhost:15674')
    expect(instance.connected).toBe(true)
  })

  it('disconnect succesfully', async () => {
    let instance = await new RabbitmqStomp('localhost:15674')
    let disconnect = await instance.disconnect()
    expect(disconnect).toBe(true)
  })
})

describe('producers', () => {
  let instance = undefined

  beforeEach(async () => {
    instance = await new RabbitmqStomp('localhost:15674')
  })

  afterEach(async () => {
    await instance.disconnect()
  })

  it('publish string', () => {
    let ok = instance.publish('amq.topic', 'example.topic', 'HELLO WORLD')
    expect(ok).toBe(true)
  })

  it('publish object', () => {
    let ok = instance.publish('amq.topic', 'example.topic', {
      data: 'HELLO WORLD'
    })
    expect(ok).toBe(true)
  })
})

describe('consumers', () => {
  let instance = undefined

  beforeEach(async () => {
    instance = await new RabbitmqStomp('localhost:15674')
  })

  afterEach(async () => {
    await instance.disconnect()
  })

  it('subscribe', () => {
    let sub = instance.subscribe('amq.topic', 'example.topic', () => {})
    expect(sub.id).toBeDefined()
    expect(sub.unsubscribe).toBeDefined()
  })

  it('receive string', async (done) => {
    let sub = instance.subscribe('amq.topic', 'example.topic', (message) => {
      expect(message).toBe('Test Message')
      done()
    })
    instance.publish('amq.topic', 'example.topic', 'Test Message')
  })

  it('receive object', async (done) => {
    let sub = instance.subscribe('amq.topic', 'example.topic', (message) => {
      expect(message).toEqual({ data: 'Test Message' })
      done()
    })
    instance.publish('amq.topic', 'example.topic', {
      data: 'Test Message'
    })
  })

  it('receive on wildcard subscription', async (done) => {
    let sub = instance.subscribe('amq.topic', 'example.*', (message) => {
      expect(message).toBe('Test Message')
      done()
    })
    instance.publish('amq.topic', 'example.topic', 'Test Message')
  })
})
