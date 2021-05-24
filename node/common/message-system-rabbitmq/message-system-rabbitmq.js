const amqp = require('amqplib')

class Connection {
  constructor (host, options) {
    this.connector = null
    this.lastError = null
    return (async () => {
      this.pipes = new Pipes()
      await this.connect(host, options)
      return this
    })()
  }

  connected () {
    return this.connector !== null
  }

  async connect (host, options = {}) {
    if (this.connector || !host) {
      return false
    }

    let url = this._decodeUrl(host, options)

    if (url) {
      try {
        let socketOptions = this._parseSocketOptions(options)
        this.connector = await amqp.connect(url, socketOptions)
        return await this.newPipe()
      } catch (e) {
        this.lastError = e
      }
    }
    return false
  }

  _decodeUrl (host, options) {
    try {
      // workaround URL parsing bug for 'localhost:8080' resulting in protocol 'localhost:'
      let url = (host.indexOf('://') === -1) ? 'amqp://' + host : host
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

  _parseSocketOptions (options) {
    return {
      ...options.noDelay && {noDelay: options.noDelay},
      ...options.certificate && {cert: options.certificate},
      ...options.key && {key: options.key},
      ...options.passPhrase && {passPhrase: options.passPhrase},
      ...options.trustedCACertificates && {ca: options.trustedCACertificates}
    }
  }

  async newPipe () {
    try {
      return await this.pipes.create(this.connector)
    } catch (e) {
      this.lastError = e
    }
    return false
  }

  async disconnect () {
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

  async publish (pipeId, group, topic, message, options = {}) {
    try {
      return await this.pipes.publish(pipeId, group, topic, message, options)
    } catch (e) {
      this.lastError = e
    }
    return false
  }

  async subscribe (pipeId, group, topics, callback, options = {}) {
    try {
      return await this.pipes.subscribe(pipeId, group, topics, callback, options)
    } catch (e) {
      this.lastError = e
    }
    return false
  }
}

class Pipes {
  static idCounter = 0
  constructor () {
    this.pipes = new Map()
  }

  async create (connector) {
    if (connector) {
      let channel = await connector.createChannel()
      let pipeId = ++Pipes.idCounter
      this.pipes.set(pipeId, {
        channel,
        exchanges: new Exchanges(),
        sender: new Sender(),
        queues: new Queues(),
        receiver: new Receiver()
      })
      return pipeId
    }
    return false
  }

  get (id) {
    let pipe = (id === null) ? this.pipes.values().next().value : this.pipes.get(id)
    return (pipe && pipe.channel) || false
  }

  async publish (id, group, topic, message, options) {
    let pipe = this.pipes.get(id || 1)
    if (!pipe || !pipe.channel) {
      return false
    }

    await pipe.exchanges.obtain(pipe.channel, group, 'topic', options)
    return await pipe.sender.publish(pipe.channel, group, topic, message, options)
  }

  async subscribe (id, group, topics, callback, options) {
    let pipe = this.pipes.get(id || 1)
    if (!pipe || !pipe.channel) {
      return false
    }

    await pipe.exchanges.obtain(pipe.channel, group, 'topic', options)
    let queue = await pipe.queues.obtain(pipe.channel, group, options)

    let bindTopics = (Array.isArray(topics)) ? topics : [topics]
    bindTopics.forEach(async key => {
      await pipe.channel.bindQueue(queue.queue, group, key)
    })

    return pipe.receiver.subscribe(pipe.channel, queue.queue, callback, options)
  }
}

class Exchanges {
  constructor () {
    this.exchanges = new Map()
  }

  async obtain (channel, group, type = 'topic', options = {}) {
    let exchange = this.exchanges.get(group)
    if (!exchange) {
      let exchangeOptions = this._parseExchangeOptions(options)
      exchange = await channel.assertExchange(group, type, exchangeOptions)
      this.exchanges.set(group, exchange)
    }
    return exchange
  }

  _parseExchangeOptions (options) {
    return {
      exclusive: options.exclusive || false,
      durable: options.durable || false,
      autoDelete: options.autoDelete || false
    }
  }
}

class Sender {
  async publish(channel, group, topic, message, options) {
    if (channel) {
      let publishOptions = this._parsePublishOptions(options)
      let buffer = this._createBuffer(message)
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
      ...options.expiration && {expiration: options.expiration},
      ...options.priority && {priority: options.priority},
      ...options.persistent && {persistent: options.persistent},
      // used by RabbitMQ but not sent to consumers
      ...options.blindCarbonCopy && {BCC: options.blindCarbonCopy},
      ...options.mandatory && {mandatory: options.mandatory},
      // ignored by RabbitMQ but may be useful for consumers
      ...options.contentType && {contentType: options.contentType},
      ...options.contentEncoding && {contentEncoding: options.contentEncoding},
      ...options.headers && {headers: options.headers},
      ...options.correlationId && {correlationId: options.correlationId},
      ...options.replyTo && {replyTo: options.replyTo},
      ...options.messageId && {messageId: options.messageId},
      ...options.timestamp && {timestamp: options.timestamp},
      ...options.type && {type: options.type},
      ...options.applicationId && {appId: options.applicationId}
    }
  }

  _createBuffer (message) {
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
}

class Queues {
  constructor () {
    this.queues = new Map()
  }
  
  async obtain (channel, group, options) {
    let queue = group && this.queues.get(group)
    if (!queue) {
      let queueOptions = this._parseGroupOptions(options)
      queue = await channel.assertQueue('', queueOptions)
      this.queues.set(queue.queue, queue)
    }
    return queue
  }

  _parseGroupOptions (options) {
    return {
      ...options.exclusive && {exclusive: options.exclusive},
      ...options.durable && {durable: options.durable},
      ...options.autoDelete && {autoDelete: options.autoDelete},
      ...options.arguments && {arguments: options.arguments},
      ...options.timeToLive && {messageTtl: options.timeToLive},
      ...options.expires && {expires: options.expires},
      ...options.deadLetterExchange && {deadLetterExchange: options.deadLetterExchange},
      ...options.maxLength && {maxLength: options.maxLength},
      ...options.maxPriority && {maxPriority: options.maxPriority}
    }
  }
}

class Receiver {
  async subscribe (channel, queue, callback, options) {
    let consumeOptions = this._parseConsumeOptions(options)
    await channel.consume(queue, (message) => {
      if (message) {
        let content = message.content.toString()
        let contentType = message && message.properties && message.properties.contentType
        if (contentType === 'application/json') {
          content = JSON.parse(content)
        }
        callback(content, message.fields, message.properties)
      }
    }, consumeOptions)
    return true
  }

  _parseConsumeOptions (options) {
    return {
      ...options.consumerTag && {consumerTag: options.consumerTag},
      ...options.noLocal && {noLocal: options.noLocal},
      ...options.noAck && {noAck: options.noAck},
      ...options.exclusive && {exclusive: options.exclusive},
      ...options.priority && {priority: options.priority},
      ...options.arguments && {arguments: options.arguments}
    }
  }
}

module.exports = Connection