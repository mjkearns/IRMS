// require('net').createServer().listen() // Keep alive

const RabbitmqStomp = require('@ats-irms/stomp-rabbitmq/rabbitmq-stomp')
const readline = require('readline')

const CommandsProtobuf = require('./proto/commands_pb')
const CommandsMessage = CommandsProtobuf.ats.base.Commands
const CommandTypes = CommandsMessage.CommandType

const { isUint8Array } = require('util/types')
const TcpConnectorStub = require('./tcp-connector-stub')

const runOptions = {
  debug: false,
  test: false
}

let targetService = {}
let commandline = {}

const args = process.argv.slice(2)
args.forEach(function (val, index, array) {
  if (val === '--debug') {
    runOptions.debug = true
  } else if (val === '--test') {
    runOptions.test = true
  } else if (val === '--watch') {
    runOptions.test = true
  } else {
    console.warn('Unknown command:', val)
  }
})

class CustomXmlTargetService {
  constructor(options = {}) {
    this.options = {
      debug: options.debug || false,
      test: options.test
    }
    this.data = {
      transmits: 0
    }
    this.rabbitMqInstance = {}
    this.tcpConnector = {}

    if (this.options.test) {
      this.tcpConnector = new TcpConnectorStub(this.options.test)
    }

    // Start: Hard coded addresses & commands
    this.deviceIpMap = {
      ids: [1, 2, 3, 4],
      addresses: {
        1: '10.5.1.11',
        2: '10.5.2.2',
        3: '10.5.3.3',
        4: '10.5.4.4'
      }
    }

    this.deviceCommands = {
      0: { command: 'Unknown' },
      1: { command: '<tg82><move> up </move></tg82>' },
      2: { command: '<tg82><move> down </move></tg82>' }
    }

    // End: hard coded addresses & commands
    this.debugPublishMessage = this._debugPublishMessage.bind(this)
    this.onDataReceive = this._onDataReceive.bind(this)
  }

  static async create(options = {}) {
    const service = new CustomXmlTargetService(options)
    await service.initialise()
    return service
  }

  async initialise() {
    this.rabbitMqInstance = await new RabbitmqStomp('localhost:15674')
    if (this.options.debug === true) {
      console.log('Connected = ', this.rabbitMqInstance.connected)
    }

    if (this.rabbitMqInstance.connected === true) {
      this.rabbitMqInstance.subscribe(
        'amq.topic',
        '*.command.*',
        this.onDataReceive
      )
    }
  }

  parseIds(inTargetIds, inTargetCommands) {
    // Validate target IDs, remove commands mapped to invalid target IDs
    let knownTargetIds = {}
    knownTargetIds = inTargetIds.filter((id) => {
      if (this.deviceIpMap.ids.includes(id)) {
        return true
      } else {
        inTargetCommands.splice(inTargetIds.indexOf(id), 1)
        return false
      }
    })
    const invalidTargetIds = inTargetIds.filter(
      (x) => !this.deviceIpMap.ids.includes(x)
    )

    if (invalidTargetIds.length) {
      if (this.options.debug) {
        console.log(
          'Could not find the following devices: ',
          invalidTargetIds.toString()
        )
      }
    }
    return knownTargetIds
  }

  parseCommands(targetCommands) {
    // Check Commands are valid / supported
    const knownCommands = []
    for (const i of targetCommands) {
      if (i === CommandTypes.UNKNOWN) {
        if (this.options.debug) {
          console.log('Command type is Unknown, skipping...')
        }
        knownCommands.push(this.deviceCommands[i].command)
      } else if (i === CommandTypes.UP) {
        knownCommands.push(this.deviceCommands[i].command)
      } else if (i === CommandTypes.DOWN) {
        knownCommands.push(this.deviceCommands[i].command)
      } else {
        if (this.options.debug) {
          console.log('Unknown command:', i, 'skipping...')
        }
        knownCommands.push(this.deviceCommands[0].command)
      }
    }
    return knownCommands
  }

  _onDataReceive(inEncodedMessage) {
    if (!this.tcpConnector.connected) {
      console.log(
        'CustomXmlTargetService: Tcp Connections have not been initialised!'
      )
      return false
    }
    if (typeof inEncodedMessage === 'string') {
      this.debugPublishMessage(inEncodedMessage)
    } else if (isUint8Array(inEncodedMessage)) {
      let decodedMessage
      try {
        decodedMessage = CommandsMessage.deserializeBinary(inEncodedMessage)
      } catch (e) {
        if (this.options.debug) {
          console.error(e)
        }
        return false
      }

      const targetIds = decodedMessage.getIdsList()
      const targetCommands = decodedMessage.getCommandsList()

      const validTargetIds = this.parseIds(targetIds, targetCommands)
      const validCommands = this.parseCommands(targetCommands)
      let commandIndex = 0
      let transmits = 0

      for (const id of validTargetIds) {
        const address = this.deviceIpMap.addresses[id]
        const sendCommand = validCommands[commandIndex]
        if (sendCommand === 'Unknown' || typeof sendCommand === 'undefined') {
          if (this.options.debug) {
            console.log('Unable to send command to', address)
          }
        } else {
          transmits += this.tcpConnector.sendCommand(sendCommand, address)
        }
        commandIndex++
      }
      this.data.transmits += transmits
      return this.data.transmits !== 0
    } else {
      if (this.options.debug) {
        console.log('Warning: encoded data is not a byte array!')
        console.log(
          'Received type (' + typeof inEncodedMessage + '):',
          inEncodedMessage
        )
      }
      return false
    }
  }

  _debugPublishMessage(messageData) {
    if (!this.rabbitMqInstance.connected) {
      console.log('CustomXmlTargetService not connected to RabbitMq instance!')
      return false
    }
    if (!messageData) {
      console.log('Message data empty!')
      return false
    }
    if (typeof messageData !== 'string') {
      console.log('Message is not a string')
      return false
    }

    let parsedMessage = {}
    try {
      parsedMessage = JSON.parse(messageData)
      if (parsedMessage.ids.some(isNaN)) {
        throw new Error('Message IDs contain non-numeric values!')
      }
      if (parsedMessage.commands.some(isNaN)) {
        throw new Error('Message Commands contain non-numeric values!')
      }
    } catch (e) {
      console.error('Failed to parse message: ', e)
      return false
    }

    const decodedMessage = new CommandsMessage()

    try {
      decodedMessage.setCommandsList(parsedMessage.commands)
    } catch (e) {
      console.error('Failed to parse commands list: ', e)
      return false
    }

    try {
      decodedMessage.setIdsList(parsedMessage.ids)
    } catch (e) {
      console.error('Failed to parse ids list: ', e)
      return false
    }

    try {
      const serializedMessage = decodedMessage.serializeBinary()
      this.rabbitMqInstance.publish(
        'amq.topic',
        'tcs.command.do',
        serializedMessage
      )
    } catch (e) {
      console.error(e)
      return
    }
    return true
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomXmlTargetService
}

// Debug functions to send messages on command line

async function createService() {
  targetService = await CustomXmlTargetService.create(runOptions)
}

createService().then(() => {
  if (runOptions.debug) {
    commandline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    })

    commandline.setPrompt('Enter decoded message:\n')
    commandline.prompt()

    commandline.on('line', function (line) {
      targetService.debugPublishMessage(line)
      commandline.prompt(true)
    })
  }
})
