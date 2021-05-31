const Shot = require('./process-shot')
// const LeadDatabase = require('./lead-database')
// const Settings = require('./settings')
const MessageSystem = require('@ats-irms/message-system-rabbitmq')

const rabbitMQHost = 'localhost:5672'

// const examples = {
//   modelOne: {
//     lane: 1,
//     bank: 2,
//     x: 630,
//     y: -10,
//     leaddeposit: {
//       x: -10,
//       z: 350
//     }
//   }
// }

async function run() {
  const system = await new MessageSystem(rabbitMQHost)
  const pipeId = null

  if (!system.connected()) {
    console.log('failed to connect to rabbit')
    return
  }
  system
    .subscribe(pipeId, 'shots', 'shot.importer.batch', handleMessage)
    .then(() => console.log('subscribed'))
}

function handleMessage(message, fields, properties) {
  try {
    console.log('Received: ' + message.batch.length)
    const shots = message.batch
    shots.forEach((shot) => {
      console.log(shot.x + ' ' + shot.y)
      handleShot(shot)
    })
  } catch (error) {
    console.log(error)
  }
}

function handleShot(shotdata) {
  // make a new shot
  const shot = new Shot(shotdata)
  console.log(shot.model.x + ' ' + shot.model.y)
  // get the terrain model for the shot

  // find the lead deposit location
  // shot = shot.calculateLeadDeposit(terrainModel)
  // const database = new LeadDatabase(Settings.DatabaseConfig)
  // database
  //   .verifyDatabase()
  //   .then((result) => console.log('database OK ' + result))
  //   .catch((error) => console.log('verify database error ' + error))
  // database
  //   .saveLeadDeposit(examples.modelOne)
  //   .then(() => console.log('done 1'))
  //   .catch((error) => console.log('error 1 ' + error))
  // database
  //   .saveLeadDeposit(examples.modelOne)
  //   .then(() => console.log('done 2'))
  //   .catch((error) => console.log('error 2 ' + error))
  // database._pool.end()
}

// process.on('unhandledRejection', (error) => {
//     console.error('unhandled rejection ' + error);
//     process.exit(1);
//   })

run()
