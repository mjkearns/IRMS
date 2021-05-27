const express = require('express')

const port = 5001
const app = express()

app.get('/', (req, res) => {
  res.send('I am an express server')
})

app.listen(port, (err) => {
  if (err) {
    console.log('Error', err)
  } else {
    console.log('Listening')
  }
})
