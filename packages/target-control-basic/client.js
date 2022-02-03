const RabbitmqStomp = require('./rabbitmq-stomp')

const CommandsPb = require('./proto/commands_pb')
const CommandsMessage = CommandsPb.ats.base.Commands
const CommandTypes = CommandsMessage.CommandType

let instance = {}
const debug = true

async function setup() {
  const options = {
    // debug: true,
    // debugStomp: true
  }

  instance = await new RabbitmqStomp('localhost:15674', options)

  console.log('Connected = ', instance.connected)
  if (debug) {
    instance.subscribe('amq.topic', 'tcs.command.*', (message) => {
      console.log('Received (' + typeof message + '):', message)
    })
  }
}

async function publishMessage(inTargetPosition) {
  const decodedMessage = new CommandsMessage()

  decodedMessage.setIdsList([1, 2, 3, 4])
  decodedMessage.setCommandsList([
    CommandTypes[inTargetPosition],
    CommandTypes[inTargetPosition],
    CommandTypes[inTargetPosition],
    CommandTypes[inTargetPosition]
  ])

  const encodedMessage = decodedMessage.serializeBinary()

  instance.publish('amq.topic', 'tcs.command.do', encodedMessage)
}

window.onload = function () {
  const upButton = document.getElementById('TargetUpButton')
  upButton.addEventListener('click', function (e) {
    publishMessage('UP')
  })

  const downButton = document.getElementById('TargetDownButton')
  downButton.addEventListener('click', function (e) {
    publishMessage('DOWN')
  })
}

setup()
