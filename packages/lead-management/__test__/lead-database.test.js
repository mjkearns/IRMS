const LeadDatabase = require('../services/lead-database')
const Settings = require('../settings')

const examples = {
  modelOne: {
    lane: 1,
    bank: 2,
    x: 630,
    y: -10,
    leaddeposit: {
      x: -10,
      z: 350
    }
  }
}

describe('', () => {
  it('empty database constructor', () => {
    const database = new LeadDatabase()
    expect(database).toBeDefined()
  })

  it('validate database', async () => {
    const database = new LeadDatabase(Settings.DatabaseConfig)
    const result = await database.verifyDatabase()
    expect(result).toEqual(true)
  })

  it('create shot record', async () => {
    const database = new LeadDatabase(Settings.DatabaseConfig)
    await expect(database.saveLeadDeposit(examples.modelOne)).resolves.toEqual(
      true
    )
  })
})
