const MessageSystem = require('./message-system-rabbitmq')

let system = null
const host = 'localhost:25672'

const example = {
  queue: 'unit-test',
  topic: 'unit.test.topic',
  messageJson: {
    api: '1.1.0',
    message: { header: 'Welcome', body: 'Hello World!' }
  },
  messageString: 'Unit testing for the win!'
}

describe('connections', () => {
  beforeEach(async () => {
    system = await new MessageSystem()
  })

  afterEach(async () => {
    await system.disconnect()
  })

  it('exists', () => {
    expect(system).toBeDefined()
    expect(system.connect).toBeDefined()
  })

  it('fail to connect to invalid host', async () => {
    const pipeId = await system.connect('invalid-host')
    expect(pipeId).toBe(false)
    expect(system.lastError).not.toBeNull()
  })

  it('gracefully disconnect from invalid connection', async () => {
    await system.connect('invalid-host')
    const disconnect = await system.disconnect()
    expect(disconnect).toBe(true)
    expect(system.lastError).not.toBeNull()
  })

  it('connect sucessfully', async () => {
    const pipeId = await system.connect(host)
    expect(pipeId).not.toBe(false)
    expect(pipeId).toBeGreaterThan(0)
    expect(system.lastError).toBeNull()
  })

  it('disconnect sucessfully', async () => {
    await system.connect(host)
    const disconnect = await system.disconnect()
    expect(disconnect).toBe(true)
  })

  it('connecting while already connected', async () => {
    const pipeId = await system.connect(host)
    const pipeId2 = await system.connect(host)
    expect(pipeId).toBeGreaterThan(0)
    expect(pipeId2).toBe(false)
  })

  it('additional pipe creation', async () => {
    const pipeId1 = await system.connect(host)
    const pipeId2 = await system.newPipe()
    expect(pipeId1).toBeGreaterThan(0)
    expect(pipeId2).toBeGreaterThan(0)
    expect(pipeId2).not.toBe(pipeId1)
  })
})

describe('producers', () => {
  beforeEach(async () => {
    system = await new MessageSystem()
  })

  afterEach(async () => {
    await system.disconnect()
  })

  it('publish to invalid channel', async () => {
    const pipeId = await system.connect(host)
    const invalidId = pipeId + 10
    const ok = await system.publish(
      invalidId,
      example.queue,
      example.messageJson
    )
    expect(ok).toBe(false)
  })

  it('publish sucessfully', async () => {
    const pipeId = await system.connect(host)
    const ok = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageJson
    )
    expect(ok).toBe(true)
  })

  it('publish to invalid pipe', async () => {
    const ok = await system.publish(
      999,
      example.queue,
      example.topic,
      example.messageJson
    )
    expect(ok).toBe(false)
  })
})

describe('consumers', () => {
  beforeEach(async () => {
    system = await new MessageSystem()
  })

  afterEach(async () => {
    await system.disconnect()
  })

  it('subscribe to invalid pipe', async () => {
    const ok = await system.subscribe(
      999,
      example.queue,
      example.topic,
      (message) => {}
    )
    expect(ok).toBe(false)
  })

  it('subscribe', async () => {
    const pipeId = await system.connect(host)
    const subOk = await system.subscribe(
      pipeId,
      example.queue,
      example.topic,
      (message, fields, properties) => {}
    )
    expect(subOk).toBe(true)
  })

  it('subscribe and publish', async () => {
    const pipeId = await system.connect(host)
    const ok = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageJson
    )
    expect(ok).toBe(true)
    const subOk = await system.subscribe(
      pipeId,
      example.queue,
      example.topic,
      (message, fields, properties) => {}
    )
    expect(subOk).toBe(true)
  })

  it('subscribe and receive', async (done) => {
    const pipeId = await system.connect(host)
    const subOk = await system.subscribe(
      pipeId,
      example.queue,
      example.topic,
      (message, fields, properties) => {
        expect(message).toEqual(example.messageJson)
        expect(fields).toBeDefined()
        expect(properties).toBeDefined()
        expect(properties.contentType).toBe('application/json')
        done()
      }
    )
    expect(subOk).toBe(true)

    const pubOk = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageJson
    )
    expect(pubOk).toBe(true)
  })

  it('subscribe and receive string', async (done) => {
    const pipeId = await system.connect(host)
    const subOk = await system.subscribe(
      pipeId,
      example.queue,
      example.topic,
      (message, fields, properties) => {
        expect(message).toBe(example.messageString)
        expect(fields).toBeDefined()
        expect(properties).toBeDefined()
        expect(properties.contentType).toBe('text/plain')
        done()
      }
    )
    expect(subOk).toBe(true)

    const pubOk = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageString
    )
    expect(pubOk).toBe(true)
  })
})
