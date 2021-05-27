// You need a RabbitMQ system running, this can be done via a docker container:
//   docker run -d --name rabbitmq-example -p 5672:5672 rabbitmq

// When complete you can stop the container with:
//   docker stop rabbitmq-example

const MessageSystem = require('./message-system-rabbitmq')

async function run () {

  let host = 'localhost:5672'

  // instantiate and connect (also creates an initial pipe/channel on the connection)
  console.log('Connecting to ' + host)
  let system = await new MessageSystem(host)

  let pipeId = null // here null means the first available pipe

  // alternativly you can do this in two stages
  // let system = await new MessageSystem()
  // let pipeId = system.connect(host)

  // if you require mulitple pipes/channels on the connections
  // let pipeId2 = system.newPipe()

  if (!system.connected()) {
    console.log('Failed to connect - is RabbitMQ running?')
    return
  }

  console.log('Subscribing to simple.example.#')
  system.subscribe(pipeId, 'example', 'simple.example.#', handleMessage)

  let timer1 = setInterval(() => {
    let message = 'Hello ' + Math.round(Math.random() * 1000)
    system.publish(pipeId, 'example', 'simple.example.hello', message)
    console.log('Published: ' + message)
  }, 1500)

  let timer2 = setInterval(() => {
    let message = 'Goodbye ' + Math.round(Math.random() * 1000)
    system.publish(pipeId, 'example', 'simple.example.goodbye', message)
    console.log('Published: ' + message)
  }, 2000)

  setTimeout(() => {
    console.log('Shutting down')
    clearInterval(timer1)
    clearInterval(timer2)
    system.disconnect()
  }, 10000)
}

function handleMessage(message, fields, properties) {
  console.log('Received: ' + message)
}

run()