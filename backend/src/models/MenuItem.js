const mongoose = require('mongoose')

const menuItemSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
    },
    item: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
}, {
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id
            delete ret._id
            delete ret.__v
            return ret
        },
    },
})

const MenuItem = mongoose.model('MenuItem', menuItemSchema)

module.exports = MenuItem