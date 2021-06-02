// You need a RabbitMQ system running, this can be done via a docker container:
//   docker run -d --name rabbitmq-example -p 5672:5672 rabbitmq

// When complete you can stop the container with:
//   docker stop rabbitmq-example

const MessageSystem = require('./message-system-rabbitmq')

async function run() {
  const host = 'localhost:5672'

  // instantiate and connect (also creates an initial pipe/channel on the connection)
  console.log('Connecting to ' + host)
  const system = await new MessageSystem(host)

  const pipeId = null // here null means the first available pipe

  // alternatively you can do this in two stages
  // let system = await new MessageSystem()
  // let pipeId = system.connect(host)

  // if you require multiple pipes/channels on the connections
  // let pipeId2 = system.newPipe()

  if (!system.connected()) {
    console.log('Failed to connect - is RabbitMQ running?')
    return
  }

  console.log('Server - listening to jobs addressed to simple.server')
  const listenOk = await system.listen(
    pipeId,
    'simple.server',
    (message, fields, properties) => {
      console.log('Server - received job: ' + message)
      // return the job result form the callback
      if (message === 'Answer to the Ultimate Question') {
        return '42'
      } else {
        return 'Go Away'
      }
    }
  )

  if (!listenOk) {
    console.log('Server - failed to listen')
    return
  }

  console.log(
    'Client - fetching job result from simple.server for the Ultimate Question...'
  )
  // note here how fetch can be made synchronous using await
  // { content, fields, properties } are available if needed
  const { content: answer1 } = await system.fetch(
    pipeId,
    'simple.server',
    'Answer to the Ultimate Question',
    {
      // server has two seconds to respond
      timeout: 2000
    }
  )
  console.log('Client - Ultimate Question == ' + answer1)

  console.log(
    'Client - fetching job result from simple.server for the Boring Question...'
  )
  const { content: answer2 } = await system.fetch(
    pipeId,
    'simple.server',
    'Answer to the Boring Question',
    {
      timeout: 2000
    }
  )
  console.log('Client - Boring Question == ' + answer2)

  console.log('Shutting down')
  system.disconnect()
}

run()
