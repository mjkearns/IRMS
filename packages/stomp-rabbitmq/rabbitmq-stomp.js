function polyfillNode() {
  // expose on global namespace for execution within NodeJS

  if (typeof TextEncoder === 'undefined') {
    Object.assign(global, {
      TextEncoder: require('util').TextEncoder
    })
  }

  if (typeof TextDecoder === 'undefined') {
    Object.assign(global, {
      TextDecoder: require('util').TextDecoder
    })
  }

  if (typeof StompJs === 'undefined') {
    Object.assign(global, {
      StompJs: require('@stomp/stompjs')
    })
  }

  if (typeof WebSocket === 'undefined') {
    Object.assign(global, {
      WebSocket: require('ws')
    })
  }
}
polyfillNode()

class RabbitmqStomp {
  constructor(host, options = {}) {
    this.debug = options.debug || false
    this.client = null
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      await this.connect(host, options)
      resolve(this)
    })
  }

  async connect(host, options = {}) {
    if (this.client || !host) {
      return false
    }

    const config = this._decodeConfig(host, options)

    if (config) {
      return new Promise((resolve) => {
        this.client = new StompJs.Client(config) // eslint-disable-line no-undef
        this.client.onChangeState = this._onChangeState.bind(this, resolve)
        this.client.onConnect = this._onConnect.bind(this, resolve)
        this.client.onDisconnect = this._onDisconnect.bind(this, resolve)
        this.client.onError = this._onError.bind(this, resolve)
        this.client.onWebSocketClose = this._onWebSocketClose.bind(
          this,
          resolve
        )
        this.client.onWebSocketError = this._onWebSocketError.bind(
          this,
          resolve
        )
        this.client.activate()
      })
    }
  }

  _decodeConfig(host, options) {
    try {
      const { brokerURL, username, password } = this._decodeUrl(host)
      return {
        brokerURL,
        connectHeaders: {
          login: username || options.username || 'guest',
          passcode: password || options.password || 'guest',
          ...(options.virtualHost && { host: options.virtualHost })
        },
        connectionTimeout: options.connectionTimeout || 5000,
        heartbeatIncomming:
          options.heartbeatPeriod || options.heartbeat || 10000,
        heartbeatOutgoing:
          options.heartbeatPeriod || options.heartbeat || 10000,
        reconnectDelay: options.reconnectDelay || 5000,
        ...(options.debugStomp && { debug: this._debugStomp.bind(this) })
      }
    } catch (e) {
      return null
    }
  }

  _decodeUrl(host) {
    try {
      let url = host.indexOf('://') === -1 ? 'ws://' + host : host
      url = new URL(url)
      let brokerURL = url.protocol.replace(':', '') || 'ws'
      brokerURL += '://' + url.hostname + ':'
      brokerURL += url.port || 15674
      brokerURL += url.path || '/ws'
      return {
        brokerURL,
        username: url.username,
        password: url.password
      }
    } catch (e) {
      return null
    }
  }

  _debugStomp(message) {
    console.debug(message)
  }

  _log() {
    this.debug && console.log(...arguments)
  }

  _onChangeState(resolve, state) {
    this._log('ChangeState:', state)
  }

  _onConnect(resolve, frame) {
    this._log('Connected', frame)
    resolve(true)
  }

  _onDisconnect(resolve, frame) {
    this._log('OnDisconnect:', frame)
    resolve(false)
  }

  _onError(resolve, frame) {
    this._log('OnError', frame)
  }

  _onWebSocketClose(resolve, event) {
    this._log('OnWebSocketClose', event)
  }

  _onWebSocketError(resolve, event) {
    this._log('OnWebSocketClose', event)
  }

  async disconnect() {
    if (!this.connected) {
      this.lastError = new Error(
        'Attempt to disconnect from invalid connection'
      )
      return true
    }

    await this.client.deactivate()
    return true
  }

  get connected() {
    return this.client && this.client.connected
  }

  publish(group, topic, data, options = {}) {
    if (!this.connected) {
      return false
    }

    const { contentType, message } = this._parseContent(data)
    if (!contentType) {
      return false
    }

    message.destination = this._parseDestination(group, topic)
    if (!message.destination) {
      return false
    }

    message.headers = this._parseHeaders(contentType, options)

    this.client.publish(message)
    return true
  }

  _parseDestination(group, topic) {
    topic = topic || ''
    if (typeof topic !== 'string') {
      return false
    }

    if (group) {
      // subscribing/sending to an exchange destination
      // /exchange/<exchange_name/group>/<routing/binding key>
      group = group || ''
      group = group.replace('/', '')
      const topicParts = topic.split('/')
      return '/' + ['exchange', group, ...topicParts].join('/')
    } else {
      const topicParts = topic.split('/')
      return '/' + ['topic', ...topicParts].join('/')
    }
  }

  _parseContent(data) {
    if (data instanceof Uint8Array) {
      return {
        message: {
          binaryBody: data
        },
        contentType: 'application/octet-stream'
      }
    }
    switch (typeof data) {
      case 'object':
        return {
          message: {
            body: JSON.stringify(data)
          },
          contentType: 'application/json'
        }
      case 'string':
        return {
          message: {
            body: data
          },
          contentType: 'text/plain'
        }
      case 'number':
        return {
          message: {
            body: String(data)
          },
          contentType: 'text/plain'
        }
      default:
        return {
          message: false,
          contentType: false
        }
    }
  }

  _parseHeaders(contentType, options) {
    const result = Object.assign({}, options)
    result['content-type'] = contentType || 'text/plain'
    return result
  }

  subscribe(group, topic, callback) {
    if (!this.connected || typeof callback !== 'function') {
      return false
    }

    const destination = this._parseDestination(group, topic)
    if (!destination) {
      return false
    }

    return this.client.subscribe(destination, (frame) => {
      let content = frame.body
      const contentType =
        frame && frame.headers && frame.headers['content-type']
      if (contentType === 'application/octet-stream') {
        content = frame.binaryBody
      } else if (contentType === 'application/json') {
        content = JSON.parse(content)
      }

      const ack = callback(content, frame.headers, {
        command: frame.command,
        escapeHeadervalues: frame.escapeHeadervalues,
        isBinaryBody: frame.isBinaryBody,
        skipContentLengthHeader: frame.skipContentLengthHeader
      })

      if (ack === true) {
        frame.ack()
      } else if (ack === false) {
        frame.nack()
      }
    })
  }
}

// TODO - update this handle other module standards
// https://zellwk.com/blog/publishing-npm-packages-that-can-be-used-in-browsers-and-node/
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RabbitmqStomp
}
