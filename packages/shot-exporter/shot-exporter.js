const readline = require('readline')
const MessageSystem = require('../message-system-rabbitmq/message-system-rabbitmq')
const MySqlHelper = require('./my-sql-helper')

var queueConfig = {
  host: 'localhost:5672',
  pipeId: null,
  group: 'shots',
  publishTopic: 'shot.exporter.',
  subscribeTopic: 'shot.importer.'
}

var databaseConfig = {
  host: 'localhost',
  user: 'root',
  password: 'dev',
  database: 'IRMS'
}

var messageSystem = null
var sqlHelper = new MySqlHelper(
  databaseConfig.host,
  databaseConfig.user,
  databaseConfig.password,
  databaseConfig.database
)

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
  // wait for user input via command line (or an event to arrive)
  waitForInput()
}

async function publishReady() {
  let sources = await getShotSources().catch((err) => {
    disconnect()
    terminate()
  })

  if (sources.length > 0) {
    for (let i = 0; i < sources.length; i++) {
      let sourceName = sources[i]
      let lastShotId = await getLastShotId(sourceName)
      // publish ready event for this source and last processed shot id
      publish(
        {
          source: sourceName,
          lastShotId: lastShotId
        },
        'ready'
      )
    }
  } else {
    // no sources have yet been logged so send out a
    // null source for all importers to start sending batches from 0
    publish(
      {
        source: null,
        lastShotId: 0
      },
      'ready'
    )
  }
}

async function getShotSources() {
  let sources = []
  let rows = await sqlHelper.select(
    'SELECT DISTINCT(Source) AS SourceName FROM ShotData'
  )
  rows.forEach((row) => {
    sources.push(row.SourceName)
  })
  return sources
}

async function getLastShotId(sourceName) {
  let lastShotId = 0
  let rows = await sqlHelper.select(
    'SELECT MAX(SourceShotId) AS LastSourceShotId FROM ShotData WHERE Source="' +
      sourceName +
      '"'
  )
  if (rows.length === 1) {
    lastShotId = rows[0].LastSourceShotId || 0
  }
  return lastShotId
}

async function handleMessage(message, fields, properties) {
  //console.log('Received: ' + JSON.stringify(message))
  let lastShotId
  switch (fields.routingKey) {
    case 'shot.importer.ready':
      lastShotId = await getLastShotId(message.source)
      // publish ready event for this source and last processed shot id
      publish(
        {
          source: message.source,
          lastShotId: lastShotId
        },
        'ready'
      )
      break
    case 'shot.importer.batch':
      lastShotId = await storeShots(message.batch)
      // publish last processed shot id
      publish(
        {
          source: message.source,
          lastShotId: lastShotId
        },
        'ready'
      )
      break
  }
}

async function storeShots(batch) {
  let lastShotId = 0
  batch.forEach((row) => {
    let values = [
      row.source,
      row.id,
      row.x,
      row.y,
      row.lane,
      row.bank,
      row.timestamp
    ]
    sqlHelper.insert(
      'INSERT INTO ShotData (Source, SourceShotId, X, Y, Lane, Bank, Timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      values
    )
    lastShotId = row.id
  })
  return lastShotId
}

function waitForInput() {
  // show prompt
  let rl = readline.createInterface(process.stdin, process.stdout)
  rl.setPrompt('shot-exporter is running \n> ')
  rl.prompt()

  // wait for any user input to terminate
  rl.on('line', (input) => {
    rl.close()
    disconnect()
    terminate()
  })
}

async function connect() {
  messageSystem = await new MessageSystem(queueConfig.host)
  if (!messageSystem.connector) {
    throw 'shot-exporter is unable to connect to message queue.'
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
  console.log('shot-exporter has terminated.')
  process.exit(0)
}

run()
