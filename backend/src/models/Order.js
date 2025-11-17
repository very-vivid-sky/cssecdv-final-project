const mongoose = require('mongoose')
const User = require('./User')

const OrderSchema = new mongoose.Schema({
    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        validate: {
            validator: async function(value) {
                console.log(value)
                const id = typeof value === 'string' ? mongoose.Types.ObjectId(value) : value
                const user = await User.findById(id)
                return user && user.role === 'cashier'
            },
            message: 'Invalid cashier ID or cashier does not exist.',
        },
    },
    customerName: {
        type: String,
        default: null,
    },
    items: [{
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
    }],
    paymentMethod: {
        type: String,
        enum: ['GCash', 'Cash', 'Card'],
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    timeOrdered: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id
            delete ret._id
            delete ret.__v
            ret.timeOrdered = ret.timeOrdered.toLocaleString()

            ret.items = ret.items.map(item => {
                const newItem = { ...item }
                delete newItem._id
                return newItem
            })

            return ret
        },
    },
})

const Order = mongoose.model('Order', OrderSchema)
module.exports = Order
