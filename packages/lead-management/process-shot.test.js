const Shot = require('./process-shot')
const LeadDatabase = require('./lead-database')
const Settings = require('./settings')

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

const pointExamples = {
  example1: {
    originPoint: {
      x: 4,
      y: 3.5,
      z: 0
    },
    targetImpactPoint: {
      x: 3,
      y: 3.3,
      z: 10
    }
  },
  example2: {
    originPoint: {
      x: 5,
      y: 2,
      z: 0
    },
    targetImpactPoint: {
      x: 7,
      y: 1,
      z: 15
    }
  }
}

describe('', () => {
  it('empty constructor', () => {
    const shot = new Shot()
    expect(shot).toBeDefined()
  })

  it('determine example 1 15m distance point', () => {
    const shot = new Shot()
    const point = shot.determineZDistancePoint(
      pointExamples.example1.originPoint,
      pointExamples.example1.targetImpactPoint,
      15
    )
    expect(point.x).toBeCloseTo(2.5, 1)
    expect(point.y).toBeCloseTo(3.2, 1)
  })

  it('determine example 1 20m distance point', () => {
    const shot = new Shot()
    const point = shot.determineZDistancePoint(
      pointExamples.example1.originPoint,
      pointExamples.example1.targetImpactPoint,
      20
    )
    expect(point.x).toBeCloseTo(2, 1)
    expect(point.y).toBeCloseTo(3.1, 1)
  })

  it('determine example 2 20m distance point', () => {
    const shot = new Shot()
    const point = shot.determineZDistancePoint(
      pointExamples.example2.originPoint,
      pointExamples.example2.targetImpactPoint,
      20
    )
    expect(point.x).toBeCloseTo(7.66667, 5)
    expect(point.y).toBeCloseTo(0.66667, 5)
  })

  it('determine example 2 30m distance point', () => {
    const shot = new Shot()
    const point = shot.determineZDistancePoint(
      pointExamples.example2.originPoint,
      pointExamples.example2.targetImpactPoint,
      30
    )
    expect(point.x).toBeCloseTo(9, 5)
    expect(point.y).toBeCloseTo(0, 5)
  })
})

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
