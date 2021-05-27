const readline = require('readline')
const MessageSystem = require('../message-system-rabbitmq/message-system-rabbitmq')
const MySqlHelper = require('./my-sql-helper')
const Shot = require('./shot-model')

var queueConfig = {
  host: 'localhost:5672',
  pipeId: null,
  group: 'shots',
  publishTopic: 'shot.importer.',
  subscribeTopic: 'shot.exporter.'
}

var databaseConfig = {
  host: 'localhost',
  user: 'root',
  password: 'dev',
  database: 'GarstenDB'
}

var moduleConfig = {
  batchSize: 100,
  queryInterval: 60000,
  laneBaseNumber: 0
}

var messageSystem = null
var sqlHelper = new MySqlHelper(
  databaseConfig.host,
  databaseConfig.user,
  databaseConfig.password,
  databaseConfig.database
)
var lastShotId = 0
var queryTimer = null

async function run() {
  // connect to message queue
  await connect().catch((err) => {
    // failed to connect, terminate
    console.log(err)
    terminate()
  })
  // subscribe to topics
  await subscribe()
  // publish ready message
  await publishReady()
  // start the timer
  startQueryTimer()
  // wait for user input via command line (or an event to arrive)
  waitForInput()
}

function startQueryTimer() {
  queryTimer = setInterval(processBatch, moduleConfig.queryInterval)
}

async function publishReady() {
  publish(
    {
      source: getSource()
    },
    'ready'
  )
}

function getSource() {
  return 'aros:' + databaseConfig.host + ':' + databaseConfig.database
}

async function handleMessage(message, fields, properties) {
  //console.log('Received: ' + JSON.stringify(message))
  switch (fields.routingKey) {
    case 'shot.exporter.ready':
      if (message.source === null || message.source === getSource()) {
        lastShotId = message.lastShotId
      }
      await processBatch()
      break
  }
}

async function processBatch() {
  let rows = await sqlHelper.select(
    'SELECT SequenceNo, XPos, YPos, Lane, Bank, TimeStamp FROM ShotDetails WHERE SequenceNo > ' +
      lastShotId +
      ' LIMIT ' +
      moduleConfig.batchSize
  )
  let shots = []
  rows.forEach((row) => {
    let shot = new Shot()
    shot.id = row.SequenceNo
    shot.x = row.XPos
    shot.y = row.YPos
    shot.lane = modeulConfig.laneBaseNumber + row.Lane
    shot.bank = row.Bank
    shot.timestamp = row.TimeStamp
    shot.source = getSource()
    shots.push(shot)
  })
  if (shots.length > 0) {
    publish(
      {
        source: getSource(),
        batch: shots
      },
      'batch'
    )
  } else {
    console.log(
      'No shot data available to process.  Trying automatically in ' +
        moduleConfig.queryInterval / 1000 +
        ' seconds'
    )
  }
}

function waitForInput() {
  // show prompt
  let rl = readline.createInterface(process.stdin, process.stdout)
  rl.setPrompt('aros-shot-importer is running \n> ')
  rl.prompt()

  // wait for any user input to terminate
  rl.on('line', (input) => {
    clearInterval(queryTimer)
    rl.close()
    disconnect()
    terminate()
  })
}

async function connect() {
  messageSystem = await new MessageSystem(queueConfig.host)
  if (!messageSystem.connector) {
    throw 'aros-shot-importer is unable to connect to message queue.'
  }
}

function disconnect() {
  messageSystem.disconnect()
}

async function subscribe() {
  await messageSystem.subscribe(
    queueConfig.pipeId,
    queueConfig.group,
    queueConfig.subscribeTopic + '#',
    handleMessage
  )
}

function publish(message, subtopic) {
  messageSystem.publish(
    queueConfig.pipeId,
    queueConfig.group,
    queueConfig.publishTopic + subtopic,
    message
  )
  console.log(
    'Published: ' +
      queueConfig.publishTopic +
      subtopic +
      ':' +
      JSON.stringify(message)
  )
}

function terminate() {
  console.log('aros-shot-importer has terminated.')
  process.exit(0)
}

run()
