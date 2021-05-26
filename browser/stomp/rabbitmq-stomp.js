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
  constructor (host, options = {}) {
    this.debug = options.debug || false
    this.client = null
    return new Promise(async (resolve) => {
      await this.connect(host, options)
      resolve(this)
    })
  }

  async connect (host, options = {}) {
    if (this.client || !host) {
      return false
    }

    let config = this._decodeConfig(host, options)

    if (config) {
      return new Promise(resolve => {
        this.client = new StompJs.Client(config)
        this.client.onChangeState = this._onChangeState.bind(this, resolve)
        this.client.onConnect = this._onConnect.bind(this, resolve)
        this.client.onDisconnect = this._onDisconnect.bind(this, resolve)
        this.client.onError = this._onError.bind(this, resolve)
        this.client.onWebSocketClose = this._onWebSocketClose.bind(this, resolve)
        this.client.onWebSocketError = this._onWebSocketError.bind(this, resolve)
        this.client.activate()
      })
    }
  }

  _decodeConfig (host, options) {
    try {
      let {brokerURL, username, password} = this._decodeUrl(host)
      return {
        brokerURL,
        connectHeaders: {
          login: username || options.username || 'guest',
          passcode: password || options.password || 'guest',
          ...options.virtualHost && {host: options.virtualHost}
        },
        connectionTimeout: options.connectionTimeout || 5000,
        heartbeatIncomming: options.heartbeatPeriod || options.heartbeat || 10000,
        heartbeatOutgoing: options.heartbeatPeriod || options.heartbeat || 10000,
        reconnectDelay: options.reconnectDelay || 5000,
        ...options.debugStomp && {debug: this._debugStomp.bind(this)}
      }
    } catch (e) {
      return null
    }
  }

  _decodeUrl (host) {
    try {
      let url = (host.indexOf('://') === -1) ? 'ws://' + host : host
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

  _debugStomp (message) {
    console.debug(message)
  }

  _log () {
    this.debug && console.log(...arguments)
  }

  _onChangeState (resolve, state) {
    this._log('ChangeState:', state)
  }

  _onConnect (resolve, frame) {
    this._log('Connected', frame)
    resolve(true)
  }

  _onDisconnect (resolve, frame) {
    this._log('OnDisconnect:', frame)
    resolve(false)
  }

  _onError (resolve, frame) {
    this._log('OnError', frame)
  }

  _onWebSocketClose (resolve, event) {
    this._log('OnWebSocketClose', event)
  }

  _onWebSocketError (resolve, event) {
    this._log('OnWebSocketClose', event)
  }

  async disconnect () {
    if (!this.connected) {
      this.lastError = new Error('Attempt to disconnect from invalid connection')
      return true
    }

    await this.client.deactivate()
    return true
  }

  get connected () {
    return this.client && this.client.connected
  }

  publish (group, topic, data, options = {}) {
    if (!this.connected) {
      return false
    }

    let destination = this._parseDestination(group, topic)
    if (!destination) {
      return false
    }

    let content = this._parseContent(data)
    let headers = this._parseHeaders(content.contentType, options)

    this.client.publish({
      destination, 
      headers, 
      body: content.body
    })
    return true
  }

  _parseDestination (group, topic) {
    topic = topic || ''
    if (typeof topic !== 'string') {
      return false
    }

    if (group) {
      // subscribing/sending to an exchange destination
      // /exchange/<exchange_name/group>/<routing/binding key>
      group = group || ''
      group = group.replace('/', '')
      let topicParts = topic.split('/')
      return '/' + ['exchange', group, ...topicParts].join('/')
    } else {
      let topicParts = topic.split('/')
      return '/' + ['topic', ...topicParts].join('/')
    }
  }

  _parseContent (data) {
    switch (typeof data) {
      case 'object':
        return {
          body: JSON.stringify(data),
          contentType: 'application/json'
        }
      case 'string':
        return {
          body: data,
          contentType: 'text/plain'
        }
      case 'number':
        return {
          body: String(data),
          contentType: 'text/plain'
        }
      default:
        return false
    }
  }

  _parseHeaders (contentType, options) {
    let result = Object.assign({}, options)
    result['content-type'] = contentType || 'text/plain'
    return result
  }

  subscribe (group, topic, callback) {
    if (!this.connected || typeof callback !== 'function') {
      return false
    }

    let destination = this._parseDestination(group, topic)
    if (!destination) {
      return false
    }

    return this.client.subscribe(destination, (frame) => {
      let content = frame.body 
      let contentType = frame && frame.headers && frame.headers['content-type']
      if (contentType === 'application/json') {
        content = JSON.parse(content)
      }
      
      let ack = callback(content, frame.headers, {
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