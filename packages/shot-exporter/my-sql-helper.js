const mysql = require('mysql2/promise')

class MySqlHelper {
  constructor (host, user, password, database) {
    this.config = {
      host,
      user,
      password,
      database
    }
    this.connection = false
  }

  async connect () {
    if (!this.connection) {
      this.connection = await mysql.createConnection(this.config)
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.end()
    }
  }

  async select(sql) {
    await this.connect()
    let [rows, fields] = await this.connection.execute(sql)
    return rows
  }

  async insert(sql, values) {
    await this.connect()
    let [rows, fields] = await this.connection.execute(sql, values)
    return rows
  }
}

module.exports = MySqlHelper