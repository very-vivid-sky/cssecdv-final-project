const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const handleDuplicateKeyError = require('../utils/errorHandler')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['cashier', 'manager'],
        required: true,
    },
}, {
    // Modify _id to id and remove __v
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id
            delete ret._id
            delete ret.__v
            return ret
        },
    },
})

// hash password before saving to db
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.post('save', function(error, doc, next) {
    handleDuplicateKeyError(error, next)
})

userSchema.post('findOneAndUpdate', function(error, res, next) {
    handleDuplicateKeyError(error, next)
})

const User = mongoose.model('User', userSchema)

module.exports = User
