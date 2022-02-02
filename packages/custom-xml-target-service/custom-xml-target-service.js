require('net').createServer().listen() // Keep alive

const RabbitmqStomp = require('@ats-irms/stomp-rabbitmq/rabbitmq-stomp')
const readline = require('readline')

const CommandsProtobuf = require('./commands_pb')
const CommandsMessage = CommandsProtobuf.ats.base.Commands
const CommandTypes = CommandsMessage.CommandType

const { isUint8Array } = require('util/types')
const TcpConnectorStub = require('./tcp-connector-stub')

class CustomXmlTargetService {
  constructor() {
    this.rabbitMqInstance = {}
    this.tcpConnector = new TcpConnectorStub()
    this.initialised = false
    // Hard coded addresses and commands
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

    this.debugPublishMessage = this._debugPublishMessage.bind(this)
    this.onDataReceive = this._onDataReceive.bind(this)
  }

  static async create() {
    const service = new CustomXmlTargetService()
    await service.initialise()
    service.initialised = true
    return service
  }

  async initialise() {
    const options = {
      debug: false,
      debugStomp: false
    }
    this.rabbitMqInstance = await new RabbitmqStomp('localhost:15674', options)
    console.log('Connected = ', this.rabbitMqInstance.connected)

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
      console.log(
        'Could not find the following devices: ',
        invalidTargetIds.toString()
      )
    }
    return knownTargetIds
  }

  parseCommands(targetCommands) {
    // Check Commands are valid / supported
    const knownCommands = []
    for (const i of targetCommands) {
      if (i === CommandTypes.UNKNOWN) {
        console.log('Command type is Unknown, skipping...')
        knownCommands.push(this.deviceCommands[i].command)
      } else if (i === CommandTypes.UP) {
        knownCommands.push(this.deviceCommands[i].command)
      } else if (i === CommandTypes.DOWN) {
        knownCommands.push(this.deviceCommands[i].command)
      } else {
        console.log('Unknown command:', i, 'skipping...')
        knownCommands.push(this.deviceCommands[0].command)
      }
    }
    return knownCommands
  }

  _onDataReceive(inEncodedMessage) {
    if (typeof inEncodedMessage === 'string') {
      this.debugPublishMessage(inEncodedMessage)
    } else if (isUint8Array(inEncodedMessage)) {
      const decodedMessage = CommandsMessage.deserializeBinary(inEncodedMessage)

      const targetIds = decodedMessage.getIdsList()
      const targetCommands = decodedMessage.getCommandsList()

      const validTargetIds = this.parseIds(targetIds, targetCommands)
      const validCommands = this.parseCommands(targetCommands)
      let commandIndex = 0

      for (const id of validTargetIds) {
        const address = this.deviceIpMap.addresses[id]
        const sendCommand = validCommands[commandIndex]
        if (sendCommand === 'Unknown') {
          console.log('Unable to send command to', address)
        } else {
          this.tcpConnector.sendCommand(sendCommand, address)
        }
        commandIndex++
      }
    } else {
      console.log('Warning: encoded data is not a byte array!')
      console.log(
        'Received type (' + typeof inEncodedMessage + '):',
        inEncodedMessage
      )
    }
  }

  _debugPublishMessage(messageData) {
    if (!this.initialised) {
      console.log('CustomXmlTargetService not initialised!')
      return
    }
    if (!messageData) {
      console.log('Message data empty!')
      return
    }
    if (typeof messageData !== 'string') {
      console.log('Message is not a string')
      return
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
      return
    }

    const decodedMessage = new CommandsMessage()

    try {
      decodedMessage.setCommandsList(parsedMessage.commands)
    } catch (e) {
      console.error('Failed to parse commands list: ', e)
      return
    }

    try {
      decodedMessage.setIdsList(parsedMessage.ids)
    } catch (e) {
      console.error('Failed to parse ids list: ', e)
      return
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
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomXmlTargetService
}

// Debug functions to send messages on command line

let targetService

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
})

rl.setPrompt('Enter decoded message:\n')

rl.on('line', function (line) {
  targetService.debugPublishMessage(line)
  rl.prompt(true)
})

async function createService() {
  targetService = await CustomXmlTargetService.create()
  rl.prompt()
}

createService()
