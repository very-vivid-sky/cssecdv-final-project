const mongoose = require('mongoose')
const User = require('./../models/User')

require('dotenv').config()

async function deleteAllData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {})

        await User.deleteMany({})

        console.log('All users have been deleted from the database')
    } catch (error) {
        console.error('Error deleting data:', error)
    } finally {
        mongoose.connection.close()
    }
}

deleteAllData()
