const dotenv = require('dotenv');
const config = dotenv.config();

exports.DatabaseConfig = 
{
    host: process.env.DATABASEHOST,
    user: process.env.DATABASEUSER,
    password: process.env.DATABASEPASSWORD,
    database: process.env.DATABASENAME
}