const mysql = require('mysql2/promise')

const getConnection = async (config) => {
  const connection = mysql.createConnection(config)
  return connection
}
exports.getConnection = getConnection
