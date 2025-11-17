const mongoose = require('mongoose')
const User = require('./../models/User')
const MenuItem = require('./../models/MenuItem')
const Order = require('./../models/Order')

require('dotenv').config()

const seedUsers = [
    {
        _id: new mongoose.Types.ObjectId(),
        username: 'cashier1',
        password: 'password123',
        role: 'cashier',
    },
    {
        _id: new mongoose.Types.ObjectId(),
        username: 'cashier2',
        password: 'password456',
        role: 'cashier',
    },
    {
        _id: new mongoose.Types.ObjectId(),
        username: 'manager1',
        password: 'managerpass123',
        role: 'manager',
    },
    {
        _id: new mongoose.Types.ObjectId(),
        username: 'manager2',
        password: 'managerpass456',
        role: 'manager',
    },
]

const seedMenuItems = [
    {
        _id: new mongoose.Types.ObjectId(),
        type: 'Sandwiches',
        item: 'Chicken Shawarma',
        price: 130,
    },
    {
        _id: new mongoose.Types.ObjectId(),
        type: 'Burgers',
        item: 'Classic Burger',
        price: 100,
    },
    {
        _id: new mongoose.Types.ObjectId(),
        type: 'Drinks',
        item: 'Iced Tea',
        price: 50,
    },
    {
        _id: new mongoose.Types.ObjectId(),
        type: 'Sides',
        item: 'French Fries',
        price: 40,

    },
    {
        _id: new mongoose.Types.ObjectId(),
        type: 'Salads',
        item: 'Caesar Salad',
        price: 80,
    },
]

const seedOrders = [
    {
        cashier: seedUsers[0]._id,
        customerName: 'Test Customer 1',
        items: [
            {
                item: seedMenuItems[0]._id,
                quantity: 2,
            },
            {
                item: seedMenuItems[1]._id,
                quantity: 3,
            },
            {
                item: seedMenuItems[2]._id,
                quantity: 1,
            },
        ],
        paymentMethod: 'GCash',
        totalAmount: 200,
    },
    {
        cashier: seedUsers[1]._id,
        customerName: 'Test Customer 2',
        items: [
            {
                item: seedMenuItems[2]._id,
                quantity: 3,
            },
            {
                item: seedMenuItems[3]._id,
                quantity: 1,
            },
            {
                item: seedMenuItems[4]._id,
                quantity: 1,
            },
        ],
        total: 180,
        tax: 15,
        discount: 0,
        status: 'Paid',
        paymentMethod: 'Card',
        totalAmount: 150,
    },
]

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {})

        await User.deleteMany({})
        await MenuItem.deleteMany({})
        await Order.deleteMany({})

        await User.create(seedUsers)
        await MenuItem.create(seedMenuItems)
        await Order.create(seedOrders)

        console.log('Database seeded successfully')
    } catch (error) {
        console.error('Error seeding database:', error)
    } finally {
        mongoose.connection.close()
    }
}

seedDatabase()
