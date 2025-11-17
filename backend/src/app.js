const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const logger = require('./middleware/logger')
const path = require('path')
const routes = require('./routes')
const errorHandler = require('./utils/errorHandler')

require('dotenv').config()

const app = express()

const mongoUrl = process.env.MONGODB_URI

mongoose.connect(mongoUrl).then(() => {
    console.log('connected to database')
})

app.use(express.json())
app.use(cors())

if (process.env.NODE_ENV === 'development') {
    app.use(logger)
}

app.use('/api', routes)

const frontendPath = path.join(__dirname, '../../frontend/dist')

app.use(express.static(frontendPath))

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'))
})

// app.use(express.static(path.join(__dirname, '../../frontend/dist')))
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
// })

app.use(errorHandler)

module.exports = app
