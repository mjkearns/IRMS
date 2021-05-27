const Shot = require('./process-shot')
const LeadDatabase = require('./lead-database')
const Settings = require('./settings')

let examples = {
    modelOne: {
      'lane': 1,
      'bank': 2,
      'x': 630,
      'y': -10,
      'leaddeposit': {
        'x': -10,
        'z': 350
      }
    }
  }

function doShot() {
    //make a new shot
    let shot = new Shot(examples.modelOne)
    //find the lead deposit location
    //shot = shot.calculateLeadDeposit(terrainModel)
    let database = new LeadDatabase(Settings.DatabaseConfig)
    database.verifyDatabase().then((result) => console.log('database OK ' + result)).catch((error) => console.log('verify database error ' + error))
    database.saveLeadDeposit(examples.modelOne).then(() => console.log('done 1')).catch((error) => console.log('error 1 ' + error))
    database.saveLeadDeposit(examples.modelOne).then(() => console.log('done 2')).catch((error) => console.log('error 2 ' + error))
    //database._pool.end()
}

// process.on('unhandledRejection', (error) => { 
//     console.error('unhandled rejection ' + error);
//     process.exit(1);
//   })

doShot()