const fs = require('fs')
const database = require('../services/database')

function loadConfigFile(fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile('./__tests__/data/' + fileName, null, (error, data) => {
      if (error) {
        reject(error)
      } else {
        const config = JSON.parse(data)
        resolve(config)
      }
    })
  })
}

describe('connect and create a database', () => {
  let config
  let connection
  it('read a configuration file', async () => {
    await loadConfigFile('testdatabase_step_1.json')
      .then((loadedConfig) => {
        config = loadedConfig
      })
      .catch((error) => {
        console.log(error)
      })
    expect(config).toBeDefined()
  })
  // it('fail to connect to database server', () => {
  //   let failconfig
  //   Object.assign(failconfig, )
  //   database.connect(config)
  // })
  it('connect to database server', async () => {
    connection = database.getConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    })
    expect(connection).toBeDefined()
  })
  it('check required permissions (must be able to create schemas)', async () => {
    const exists = database._checkServerPermissions(connection, config)
    expect(exists).toEqual(true)
  })
  it('check if schema exists (should not exist)', () => {
    const exists = database._schemaExists(connection, config)
    expect(exists).toEqual(false)
  })
  it('create a schema and check it exists', async () => {
    await database._createSchema(connection, config)
    const exists = database._schemaExists(connection, config)
    expect(exists).toEqual(true)
  })
  it('check required permissions (must be able to create objects in schema)', async () => {
    const exists = database._checkSchemaPermissions(connection, config)
    expect(exists).toEqual(true)
  })
  it('check if a table exists (should not exist)', () => {
    const exists = database._tableExists(connection, config, 'test_table')
    expect(exists).toEqual(false)
  })
  it('create a table and check it exists', async () => {
    await database._createTable(connection, config)
    const exists = database._tableExists(connection, config, 'test_table')
    expect(exists).toEqual(true)
  })
})

describe('connect and change a table', () => {
  let config
  let connection
  it('read a configuration file', async () => {
    await loadConfigFile('testdatabase_step_2.json')
      .then((loadedConfig) => {
        config = loadedConfig
      })
      .catch((error) => {
        console.log(error)
      })
    expect(config).toBeDefined()
  })
  it('connect to database server', async () => {
    connection = database.getConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    })
    expect(connection).toBeDefined()
  })
  it('check if a table exists', () => {
    const exists = database._tableExists(connection, config, 'test_table')
    expect(exists).toEqual(true)
  })
  it('check if a table matches schema', () => {
    const checkResult = database._checkTableSchema(
      connection,
      config,
      'test_table'
    )
    expect(checkResult).toEqual(false)
  })
  it('update a table and check it matches schema', async () => {
    await database._updateTableSchema(connection, config, 'test_table')
    const checkResult = database._checkTableSchema(
      connection,
      config,
      'test_table'
    )
    expect(checkResult).toEqual(true)
  })
})

describe('connect and change a database', () => {
  let config
  let connection
  it('read a configuration file', async () => {
    await loadConfigFile('testdatabase_step_3.json')
      .then((loadedConfig) => {
        config = loadedConfig
      })
      .catch((error) => {
        console.log(error)
      })
    expect(config).toBeDefined()
  })
  it('connect to database server', async () => {
    connection = database.getConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    })
    expect(connection).toBeDefined()
  })
  it('check database schema', () => {
    const checkResult = database.checkSchema(connection, config)
    expect(checkResult).toEqual(false)
  })
  it('upgrade entire schema', async () => {
    await database.upgradeSchema(connection, config)
    const checkResult = database.checkSchema(connection, config)
    expect(checkResult).toEqual(true)
  })
})
