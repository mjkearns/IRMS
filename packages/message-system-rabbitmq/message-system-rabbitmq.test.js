const MessageSystem = require('./message-system-rabbitmq')

let system = null
let host = 'localhost:25672'

let example = {
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
    let pipeId = await system.connect('invalid-host')
    expect(pipeId).toBe(false)
    expect(system.lastError).not.toBeNull()
  })

  it('gracefully disconnect from invalid connection', async () => {
    let pipeId = await system.connect('invalid-host')
    let disconnect = await system.disconnect()
    expect(disconnect).toBe(true)
    expect(system.lastError).not.toBeNull()
  })

  it('connect sucessfully', async () => {
    let pipeId = await system.connect(host)
    expect(pipeId).not.toBe(false)
    expect(pipeId).toBeGreaterThan(0)
    expect(system.lastError).toBeNull()
  })

  it('disconnect sucessfully', async () => {
    let pipeId = await system.connect(host)
    let disconnect = await system.disconnect()
    expect(disconnect).toBe(true)
  })

  it('connecting while already connected', async () => {
    let pipeId = await system.connect(host)
    let pipeId2 = await system.connect(host)
    expect(pipeId).toBeGreaterThan(0)
    expect(pipeId2).toBe(false)
  })

  it('additional pipe creation', async () => {
    let pipeId1 = await system.connect(host)
    let pipeId2 = await system.newPipe()
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
    let pipeId = await system.connect(host)
    let invalidId = pipeId + 10
    let ok = await system.publish(invalidId, example.queue, example.messageJson)
    expect(ok).toBe(false)
  })

  it('publish sucessfully', async () => {
    let pipeId = await system.connect(host)
    let ok = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageJson
    )
    expect(ok).toBe(true)
  })

  it('publish to invalid pipe', async () => {
    let ok = await system.publish(
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
    let ok = await system.subscribe(
      999,
      example.queue,
      example.topic,
      (message) => {}
    )
    expect(ok).toBe(false)
  })

  it('subscribe', async () => {
    let pipeId = await system.connect(host)
    let subOk = await system.subscribe(
      pipeId,
      example.queue,
      example.topic,
      (message, fields, properties) => {}
    )
    expect(subOk).toBe(true)
  })

  it('subscribe and publish', async () => {
    let pipeId = await system.connect(host)
    let ok = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageJson
    )
    expect(ok).toBe(true)
    let subOk = await system.subscribe(
      pipeId,
      example.queue,
      example.topic,
      (message, fields, properties) => {}
    )
    expect(subOk).toBe(true)
  })

  it('subscribe and receive', async (done) => {
    let pipeId = await system.connect(host)
    let subOk = await system.subscribe(
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

    let pubOk = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageJson
    )
    expect(pubOk).toBe(true)
  })

  it('subscribe and receive string', async (done) => {
    let pipeId = await system.connect(host)
    let subOk = await system.subscribe(
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

    let pubOk = await system.publish(
      pipeId,
      example.queue,
      example.topic,
      example.messageString
    )
    expect(pubOk).toBe(true)
  })
})
