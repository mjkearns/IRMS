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
  messageString: 'Unit testing for the win!',
  messageNumber: 1234
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

  it('check connected when not', async () => {
    const connected = system.connected()
    expect(connected).toBe(false)
  })

  it('connect successfully', async () => {
    const pipeId = await system.connect(host)
    expect(pipeId).not.toBe(false)
    expect(pipeId).toBeGreaterThan(0)
    expect(system.lastError).toBeNull()
  })

  it('check connected when connected', async () => {
    await system.connect(host)
    const connected = system.connected()
    expect(connected).toBe(true)
  })

  it('disconnect successfully', async () => {
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

  it('publish successfully', async () => {
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

  it('subscribe and receive number', async (done) => {
    const pipeId = await system.connect(host)
    const subOk = await system.subscribe(
      pipeId,
      example.queue,
      example.topic,
      (message, fields, properties) => {
        expect(message).toBe(example.messageNumber)
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
      example.messageNumber
    )
    expect(pubOk).toBe(true)
  })
})

describe('prosumers', () => {
  beforeEach(async () => {
    system = await new MessageSystem()
  })

  afterEach(async () => {
    await system.disconnect()
  })

  it('fetch no response timeout', async () => {
    const pipeId = await system.connect(host)
    const ok = await system.fetch(
      pipeId,
      example.queue,
      example.messageString,
      { timeout: 2000 }
    )
    expect(ok).toBe(false)
  })

  it('fetch invalid pipe', async () => {
    const ok = await system.fetch(
      999999,
      example.queue,
      example.messageString,
      { timeout: 2000 }
    )
    expect(ok).toBe(false)
  })

  it('listen', async (done) => {
    const pipeId = await system.connect(host)
    const listenOk = await system.listen(
      pipeId,
      'abc',
      (message, fields, properties) => {
        // never fires
        done.fail('unexpected response')
      }
    )
    expect(listenOk).toBe(true)
    done()
  })

  it('listen invalid pipe', async (done) => {
    const listenOk = await system.listen(
      999999,
      'abc',
      (message, fields, properties) => {
        // never fires
        done.fail('unexpected response')
      }
    )
    expect(listenOk).toBe(false)
    done()
  })

  it('fetch with response', async () => {
    const pipeId = await system.connect(host)
    const listenOk = await system.listen(
      pipeId,
      'abc',
      (message, fields, properties) => {
        expect(message).toEqual(example.messageString)
        return 'Fetched Data'
      }
    )
    expect(listenOk).toBe(true)

    const { content, fields, properties } = await system.fetch(
      pipeId,
      'abc',
      example.messageString,
      {
        timeout: 2000
      }
    )
    expect(fields).toBeDefined()
    expect(properties.contentType).toBe('text/plain')
    expect(content).toBe('Fetched Data')
  })
})
