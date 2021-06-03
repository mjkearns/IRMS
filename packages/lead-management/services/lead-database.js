const mysql = require('mysql')

class LeadDatabase {
  constructor(settings) {
    this.settings = this.processSettings(settings)
  }

  processSettings(settings) {
    return Object.assign(
      {
        connectionLimit: 5,
        host: 'localhost',
        user: 'root',
        password: 'dev',
        database: 'leadmanagement'
      },
      settings || {}
    )
  }

  async _usePooledConnectionAsync(asyncAction) {
    if (!this._pool) this._pool = mysql.createPool(this.settings)
    const connection = await new Promise((resolve, reject) => {
      this._pool.getConnection((error, connection) => {
        if (error) {
          reject(error)
        } else {
          resolve(connection)
        }
      })
    })
    try {
      return await asyncAction(connection)
    } finally {
      connection.release()
    }
  }

  verifyDatabase() {
    const checkDbResponse = this._checkAndCreateDatabase()
      .then((result) => {
        const checkTableResponse = this._checkTable({
          name: 'lead_deposit'
        }).then((result) => {
          if (!result) {
            const createTableResponse = this._createTable()
              .then((result) => {
                return result
              })
              .catch((error) => {
                throw error
              })
            return createTableResponse
          } else {
            return true
          }
        })
        return checkTableResponse
      })
      .catch((error) => {
        throw error
      })
    return checkDbResponse
  }

  async _checkAndCreateDatabase() {
    const localsettings = {}
    Object.assign(localsettings, this.settings || {}, {
      database: 'mysql'
    })
    const response = await new Promise((resolve, reject) => {
      const connection = mysql.createConnection(localsettings)
      connection.connect((error) => {
        if (error) {
          reject(error)
        } else {
          new Promise((resolve, reject) => {
            const sql =
              "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '" +
              this.settings.database +
              "'"
            connection.query(sql, (error, results, fields) => {
              if (error) {
                reject(error)
              } else {
                if (results.length) {
                  resolve(true)
                } else {
                  connection.query(
                    'CREATE SCHEMA ' + this.settings.database,
                    (error, results, fields) => {
                      if (error) {
                        reject(error)
                      } else {
                        resolve(true)
                      }
                    }
                  )
                }
              }
            })
          })
            .catch((error) => {
              reject(error)
            })
            .then((result) => {
              resolve(result)
            })
            .finally(() => {
              connection.end()
            })
        }
      })
    }).catch((error) => {
      throw error
    })
    return response
  }

  async _checkTable(tableDefinition) {
    const connectionResponse = await this._usePooledConnectionAsync(
      async (connection) => {
        const createResponse = await new Promise((resolve, reject) => {
          const sql =
            "SELECT table_name FROM information_schema.tables WHERE table_schema = '" +
            this.settings.database +
            "' AND table_name = '" +
            tableDefinition.name +
            "'"
          connection.query(sql, (error, results, fields) => {
            if (error) {
              reject(error)
            } else {
              resolve(results.length !== 0)
            }
          })
        })
        return createResponse
      }
    ).catch((error) => {
      throw error
    })
    return connectionResponse
  }

  async _createTable(tableDefinition) {
    const connectionResponse = await this._usePooledConnectionAsync(
      async (connection) => {
        const createResponse = await new Promise((resolve, reject) => {
          connection.query(
            tableDefinition.createstatement,
            (error, results, fields) => {
              if (error) {
                reject(error)
              } else {
                resolve(true)
              }
            }
          )
        })
        return createResponse
      }
    ).catch((error) => {
      throw error
    })
    return connectionResponse
  }

  async saveLeadDeposit(model) {
    const connectionResponse = await this._usePooledConnectionAsync(
      async (connection) => {
        const insertResponse = await new Promise((resolve, reject) => {
          const data = [1, new Date(), model.leaddeposit.x, model.leaddeposit.z]
          const sql =
            'insert into lead_deposit(tmd_id, ldp_timestamp, ldp_x, ldp_z) values(?, ?, ?, ?)'
          connection.query(sql, data, (error, results, fields) => {
            if (error) {
              reject(error)
            } else {
              resolve(true)
            }
          })
        })
        return insertResponse
      }
    ).catch((error) => {
      throw error
    })
    return connectionResponse
  }
}

module.exports = LeadDatabase
