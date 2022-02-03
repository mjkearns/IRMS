const TestServer = require('./test-server')
const SimpleTcpConnector = require('../simple-tcp-connector')

describe('', () => {
  test('write data to and receve from test server', (done) => {
    expect.assertions(1)
    const server = new TestServer()
    const connector = new SimpleTcpConnector('127.0.0.1', 50001)
    let resultData = ''
    connector.onConnect(() => {
      connector.write('hello')
    })
    connector.onDisconnect(() => {
      server.stop()
      expect(resultData).toBe('hello')
      done()
    })
    connector.onData((data) => {
      const writeDataPromise = new Promise((resolve, reject) => {
        try {
          resolve(data)
        } catch (error) {
          reject(error)
        }
      })
      writeDataPromise
        .then((data) => {
          resultData = data
        })
        .catch((error) => {
          resultData = error
        })
        .then(() => {
          connector.disconnect()
        })
    })
    server.start()
    connector.connect()
  })
})
