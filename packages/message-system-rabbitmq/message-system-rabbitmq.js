const amqp = require('amqplib')
const EventEmitter = require('events')
const uuid = require('uuid')
class Connection {
  constructor(host, options) {
    this.connector = null
    this.lastError = null
    return (async () => {
      this.pipes = new Pipes()
      await this.connect(host, options)
      return this
    })()
  }

  connected() {
    return this.connector !== null
  }

  async connect(host, options = {}) {
    if (this.connector || !host) {
      return false
    }

    const url = this._decodeUrl(host, options)

    if (url) {
      try {
        const socketOptions = this._parseSocketOptions(options)
        this.connector = await amqp.connect(url, socketOptions)
        return await this.newPipe()
      } catch (e) {
        this.lastError = e
      }
    }
    return false
  }

  _decodeUrl(host, options) {
    try {
      // workaround URL parsing bug for 'localhost:8080' resulting in protocol 'localhost:'
      let url = host.indexOf('://') === -1 ? 'amqp://' + host : host
      url = new URL(url)
      return {
        protocol: url.protocol.replace(':', '') || 'amqp',
        hostname: url.hostname || 'localhost',
        port: url.port || 5672,
        username: url.username || null,
        password: url.password || null,

        locale: options.locale || 'en-US',
        frameMax: options.maxFrameSize || options.frameMax || 0,
        heartbeat: options.heartbeatPeriod || options.heartbeat || 0,
        vhost: options.virtualHost || options.vhost || '/'
      }
    } catch (e) {
      return null
    }
  }

  _parseSocketOptions(options) {
    return {
      ...(options.noDelay && { noDelay: options.noDelay }),
      ...(options.certificate && { cert: options.certificate }),
      ...(options.key && { key: options.key }),
      ...(options.passPhrase && { passPhrase: options.passPhrase }),
      ...(options.trustedCACertificates && {
        ca: options.trustedCACertificates
      })
    }
  }

  async newPipe() {
    try {
      return await this.pipes.create(this.connector)
    } catch (e) {
      this.lastError = e
    }
    return false
  }

  async disconnect() {
    if (!this.connector) {
      return true
    }

    try {
      await this.connector.close()
      this.connector = null
      return true
    } catch (e) {
      this.lastError = e
      return false
    }
  }

  async publish(pipeId, group, topic, message, options = {}) {
    try {
      return await this.pipes.publish(pipeId, group, topic, message, options)
    } catch (e) {
      this.lastError = e
    }
    return false
  }

  async subscribe(pipeId, group, topics, callback, options = {}) {
    try {
      return await this.pipes.subscribe(
        pipeId,
        group,
        topics,
        callback,
        options
      )
    } catch (e) {
      this.lastError = e
    }
    return false
  }

  async fetch(pipeId, group, message, options = {}) {
    try {
      return await this.pipes.fetch(pipeId, group, message, options)
    } catch (e) {
      this.lastError = e
    }
    return false
  }

  async listen(pipeId, group, callback, options = {}) {
    try {
      return await this.pipes.listen(pipeId, group, callback, options)
    } catch (e) {
      this.lastError = e
    }
    return false
  }
}

class Pipes {
  constructor() {
    this.pipes = new Map()
  }

  async create(connector) {
    if (connector) {
      const channel = await connector.createChannel()
      const pipeId = ++Pipes.idCounter
      const encoderDecoder = new EncoderDecoder()
      this.pipes.set(pipeId, {
        channel,
        exchanges: new Exchanges(),
        sender: new Sender(encoderDecoder),
        queues: new Queues(),
        receiver: new Receiver(encoderDecoder),
        requestResponse: new RequestResponse(encoderDecoder)
      })
      return pipeId
    }
    return false
  }

  get(id) {
    const pipe =
      id === null ? this.pipes.values().next().value : this.pipes.get(id)
    return (pipe && pipe.channel) || false
  }

  async publish(id, group, topic, message, options) {
    const pipe = this.pipes.get(id || 1)
    if (!pipe || !pipe.channel) {
      return false
    }

    await pipe.exchanges.obtain(pipe.channel, group, 'topic', options)
    return await pipe.sender.publish(
      pipe.channel,
      group,
      topic,
      message,
      options
    )
  }

  async subscribe(id, group, topics, callback, options) {
    const pipe = this.pipes.get(id || 1)
    if (!pipe || !pipe.channel) {
      return false
    }

    await pipe.exchanges.obtain(pipe.channel, group, 'topic', options)
    const queue = await pipe.queues.obtain(pipe.channel, group, options)

    const bindTopics = Array.isArray(topics) ? topics : [topics]
    bindTopics.forEach(async (key) => {
      await pipe.channel.bindQueue(queue.queue, group, key)
    })

    return pipe.receiver.subscribe(pipe.channel, queue.queue, callback, options)
  }

  async fetch(id, group, message, options) {
    const pipe = this.pipes.get(id || 1)
    if (!pipe || !pipe.channel) {
      return false
    }

    return await pipe.requestResponse.fetch(
      pipe.channel,
      group,
      message,
      options
    )
  }

  async listen(id, group, callback, options) {
    const pipe = this.pipes.get(id || 1)
    if (!pipe || !pipe.channel) {
      return false
    }

    await pipe.queues.obtainDirect(pipe.channel, group, options)

    return await pipe.requestResponse.listen(
      pipe.channel,
      group,
      callback,
      options
    )
  }
}

Pipes.idCounter = 0

class Exchanges {
  constructor() {
    this.exchanges = new Map()
  }

  async obtain(channel, group, type = 'topic', options = {}) {
    let exchange = this.exchanges.get(group)
    if (!exchange) {
      const exchangeOptions = this._parseExchangeOptions(options)
      exchange = await channel.assertExchange(group, type, exchangeOptions)
      this.exchanges.set(group, exchange)
    }
    return exchange
  }

  _parseExchangeOptions(options) {
    return {
      exclusive: options.exclusive || false,
      durable: options.durable || false,
      autoDelete: options.autoDelete || false
    }
  }
}

class Sender {
  constructor(encoderDecoder) {
    this.encoderDecoder = encoderDecoder
  }

  async publish(channel, group, topic, message, options) {
    if (channel) {
      const publishOptions = this._parsePublishOptions(options)
      const buffer = this.encoderDecoder.createBuffer(message)
      if (buffer) {
        publishOptions.contentType = buffer.contentType
        await channel.publish(group, topic, buffer.buffer, publishOptions)
        return true
      }
    }
    return false
  }

  _parsePublishOptions(options) {
    return {
      ...(options.expiration && { expiration: options.expiration }),
      ...(options.priority && { priority: options.priority }),
      ...(options.persistent && { persistent: options.persistent }),
      // used by RabbitMQ but not sent to consumers
      ...(options.blindCarbonCopy && { BCC: options.blindCarbonCopy }),
      ...(options.mandatory && { mandatory: options.mandatory }),
      // ignored by RabbitMQ but may be useful for consumers
      ...(options.contentType && { contentType: options.contentType }),
      ...(options.contentEncoding && {
        contentEncoding: options.contentEncoding
      }),
      ...(options.headers && { headers: options.headers }),
      ...(options.correlationId && { correlationId: options.correlationId }),
      ...(options.replyTo && { replyTo: options.replyTo }),
      ...(options.messageId && { messageId: options.messageId }),
      ...(options.timestamp && { timestamp: options.timestamp }),
      ...(options.type && { type: options.type }),
      ...(options.applicationId && { appId: options.applicationId })
    }
  }
}

class Queues {
  constructor() {
    this.queues = new Map()
    this.direct = new Map()
  }

  async obtain(channel, group, options) {
    let queue = group && this.queues.get(group)
    if (!queue) {
      const queueOptions = this._parseQueueOptions(options)
      queue = await channel.assertQueue('', queueOptions)
      this.queues.set(group, queue)
    }
    return queue
  }

  async obtainDirect(channel, group, options) {
    let direct = group && this.direct.get(group)
    if (!direct) {
      const queueOptions = this._parseQueueOptions(options)
      direct = await channel.assertQueue(group, queueOptions)
      this.queues.set(group, direct)
    }
    return direct
  }

  _parseQueueOptions(options) {
    return {
      ...(options.exclusive && { exclusive: options.exclusive }),
      ...(options.durable && { durable: options.durable }),
      ...(options.autoDelete && { autoDelete: options.autoDelete }),
      ...(options.arguments && { arguments: options.arguments }),
      ...(options.timeToLive && { messageTtl: options.timeToLive }),
      ...(options.expires && { expires: options.expires }),
      ...(options.deadLetterExchange && {
        deadLetterExchange: options.deadLetterExchange
      }),
      ...(options.maxLength && { maxLength: options.maxLength }),
      ...(options.maxPriority && { maxPriority: options.maxPriority })
    }
  }
}

class Receiver {
  constructor(encoderDecoder) {
    this.encoderDecoder = encoderDecoder
  }

  async subscribe(channel, queue, callback, options) {
    const consumeOptions = this._parseConsumeOptions(options)
    await channel.consume(
      queue,
      (message) => {
        if (message) {
          const content = this.encoderDecoder.decodeMessageContent(message)
          callback(content, message.fields, message.properties)
        }
      },
      consumeOptions
    )
    return true
  }

  _parseConsumeOptions(options) {
    return {
      ...(options.consumerTag && { consumerTag: options.consumerTag }),
      ...(options.noLocal && { noLocal: options.noLocal }),
      ...(options.noAck && { noAck: options.noAck }),
      ...(options.exclusive && { exclusive: options.exclusive }),
      ...(options.priority && { priority: options.priority }),
      ...(options.arguments && { arguments: options.arguments })
    }
  }
}

class RequestResponse {
  constructor(encoderDecoder) {
    this.encoderDecoder = encoderDecoder
    this.eventEmitter = new EventEmitter()
    this.fetchConsumer = null
  }

  async fetch(channel, group, message, options) {
    this._applyFetchConsumer(channel)
    return new Promise((resolve) => {
      const fetchId = this._addFetchEmitter(resolve, options)
      const sendOptions = this._parseSendOptions(options, fetchId)
      const buffer = this.encoderDecoder.createBuffer(message)
      if (buffer) {
        sendOptions.contentType = buffer.contentType
        channel.sendToQueue(group, buffer.buffer, sendOptions)
      }
    })
  }

  _applyFetchConsumer(channel) {
    if (this.fetchConsumer) return

    this.fetchConsumer = channel.consume(
      'amq.rabbitmq.reply-to',
      (message) => {
        if (message) {
          const content = this.encoderDecoder.decodeMessageContent(message)
          const fetchId = message.properties.correlationId
          this.eventEmitter.emit(fetchId, {
            content,
            fields: message.fields,
            properties: message.properties
          })
        }
      },
      { noAck: true }
    )
  }

  _addFetchEmitter(resolve, options) {
    const timer = this._createTimer(resolve, options.timeout)
    const fetchId = uuid.v4()
    this.eventEmitter.once(fetchId, (data) => {
      clearTimeout(timer)
      resolve(data)
    })
    return fetchId
  }

  _createTimer(resolve, timeout) {
    return !timeout
      ? null
      : setTimeout(() => {
          resolve(false)
        }, timeout)
  }

  _parseSendOptions(options, fetchId) {
    return {
      ...(options.consumerTag && { consumerTag: options.consumerTag }),
      ...(options.noLocal && { noLocal: options.noLocal }),
      ...(options.noAck && { noAck: options.noAck }),
      ...(options.exclusive && { exclusive: options.exclusive }),
      ...(options.priority && { priority: options.priority }),
      ...(options.arguments && { arguments: options.arguments }),
      correlationId: fetchId,
      replyTo: 'amq.rabbitmq.reply-to'
    }
  }

  async listen(channel, group, callback, options) {
    await channel.consume(group, async (message) => {
      if (message) {
        const content = this.encoderDecoder.decodeMessageContent(message)
        const result = callback(content, message.fields, message.properties)
        const buffer = this.encoderDecoder.createBuffer(result)
        await channel.sendToQueue(message.properties.replyTo, buffer.buffer, {
          correlationId: message.properties.correlationId,
          contentType: buffer.contentType
        })
        channel.ack(message)
      }
    })
    return true
  }
}

class EncoderDecoder {
  createBuffer(message) {
    switch (typeof message) {
      case 'object':
        return {
          buffer: Buffer.from(JSON.stringify(message)),
          contentType: 'application/json'
        }

      case 'string':
        return {
          buffer: Buffer.from(message),
          contentType: 'text/plain'
        }
      case 'number':
        return {
          buffer: Buffer.from(String(message)),
          contentType: 'text/plain'
        }
      default:
        return false
    }
  }

  decodeMessageContent(message) {
    let content = message.content.toString()
    const contentType =
      message && message.properties && message.properties.contentType
    if (contentType === 'application/json') {
      content = JSON.parse(content)
    }
    return content
  }
}

module.exports = Connection
