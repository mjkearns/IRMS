const dotenv = require('dotenv')
// eslint-disable-next-line no-unused-vars
const config = dotenv.config('./config')

exports.DatabaseConfig = {
  host: process.env.DATABASEHOST,
  user: process.env.DATABASEUSER,
  password: process.env.DATABASEPASSWORD,
  database: process.env.DATABASENAME
}
