/*
  Run with: node example-node.js

  Requirements:
    RabbitMQ server with STOMP and STOMP WebSocket plugins enabled
    Run this from this directory:
      docker run -d --name rabbitmq-stomp-unit-test -p 25672:5672 -p 8888:15672 -p 15674:15674 -v ${PWD}/tests/rabbitmq.config:/etc/rabbitmq/rabbitmq.config rabbitmq:3-management

  Cleanup:
    Terminate and remove the docker container
      docker stop rabbitmq-stomp-unit-test
      docker container rm rabbitmq-stop-unit-test
*/

const RabbitmqStomp = require('./rabbitmq-stomp')

async function run () {
  let instance = await new RabbitmqStomp('localhost:15674')

  console.log('Connected = ', instance.connected)

  instance.subscribe('amq.topic', 'some.#', (message) => {
    console.log('Received (' + typeof message + '):', message)
  })

  instance.publish('amq.topic', 'some.special.key', 'Hello World')

  instance.publish('amq.topic', 'some.other.key', {
    data: 'Hello World',
    aField: true,
    someOtherField: 123
  })

  // NOTE: numbers will be converted to strings
  instance.publish('amq.topic', 'some.key', 1234)

  setTimeout(async () => {
    await instance.disconnect()
    console.log('Connected = ', instance.connected)
  }, 5000)
}

run()


