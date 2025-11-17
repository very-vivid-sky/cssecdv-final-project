const { test, describe, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../src/app')
const Order = require('../src/models/Order')
const MenuItem = require('../src/models/MenuItem')
const User = require('../src/models/User')
const mongoose = require('mongoose')

const initialCashiers = [
    {
        _id: new mongoose.Types.ObjectId(),
        username: 'testcashier999',
        password: 'password123',
        role: 'cashier',
    },
    {
        _id: new mongoose.Types.ObjectId(),
        username: 'testcashier369',
        password: 'password456',
        role: 'cashier',
    },
]

const initialMenuItems = [
    { _id: new mongoose.Types.ObjectId(), type: 'Sandwiches', item: 'Chicken Shawarma', price: 130 },
    { _id: new mongoose.Types.ObjectId(), type: 'Burgers', item: 'Classic Burger', price: 100 },
    { _id: new mongoose.Types.ObjectId(), type: 'Drinks', item: 'Iced Tea', price: 50 },
]

const initialOrders = [
    {
        cashier: initialCashiers[0]._id,
        customerName: 'Test Customer',
        items: [{ item: initialMenuItems[0]._id, quantity: 2 }],
        paymentMethod: 'GCash',
        totalAmount: 200,
    },
    {
        cashier: initialCashiers[1]._id,
        customerName: 'Another Customer',
        items: [{ item: initialMenuItems[1]._id, quantity: 1 }],
        paymentMethod: 'Card',
        totalAmount: 150,
    },
]

const api = supertest(app)

beforeEach(async () => {
    await User.deleteMany({})
    await MenuItem.deleteMany({})
    await Order.deleteMany({})

    for (const cashier of initialCashiers) {
        const newCashier = new User(cashier)
        await newCashier.save()
    }

    for (const item of initialMenuItems) {
        const newItem = new MenuItem(item)
        await newItem.save()
    }

    for (const order of initialOrders) {
        const newOrder = new Order(order)
        await newOrder.save()
    }
})

describe('Order API tests', () => {
    test('GET /api/orders returns all orders', async () => {
        const response = await api.get('/api/orders')
        assert.equal(response.status, 200)
        assert.equal(response.body.length, initialOrders.length)
    })

    test('GET /api/orders/:id returns a specific order', async () => {
        const orders = await Order.find({})
        const orderToGet = orders[0]
        const response = await api.get(`/api/orders/${orderToGet.id}`)

        assert.equal(response.status, 200)
        assert.equal(response.body.cashier, orderToGet.cashier)
    })

    test('POST /api/orders creates a new order', async () => {
        const newCashier = { username: 'Cashier Ahh', password: 'cashierAhhPassword99', role: 'cashier' }
        const newMenuItem = { type: 'Sandwhiches', item: 'Burger Ahh', price: 69 }

        const cashier = new User(newCashier)
        await cashier.save()

        const menuItem = new MenuItem(newMenuItem)
        await menuItem.save()

        const newOrder = {
            cashier: cashier._id,
            customerName: 'New Customer',
            items: [{ item: menuItem._id, quantity: 1 }],
            paymentMethod: 'GCash',
            totalAmount: 100,
        }

        const response = await api.post('/api/orders')
            .send(newOrder)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        assert.equal(response.body.cashier, newOrder.cashier)

        const ordersAtEnd = await Order.find({})
        assert.equal(ordersAtEnd.length, initialOrders.length + 1)
    })

    test('PUT /api/orders/:id updates an order', async () => {
        const orders = await Order.find({})
        const orderToUpdate = orders[0]

        const updatedOrder = {
            customerName: 'Updated Customer',
            totalAmount: 300,
        }

        await api.put(`/api/orders/${orderToUpdate.id}`)
            .send(updatedOrder)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const updatedOrderInDb = await Order.findById(orderToUpdate.id)
        assert.equal(updatedOrderInDb.customerName, updatedOrder.customerName)
        assert.equal(updatedOrderInDb.totalAmount, updatedOrder.totalAmount)
    })

    test('DELETE /api/orders/:id deletes an order', async () => {
        const orders = await Order.find({})
        const orderToDelete = orders[0]

        await api.delete(`/api/orders/${orderToDelete.id}`)
            .expect(200)

        const ordersAtEnd = await Order.find({})
        assert.equal(ordersAtEnd.length, initialOrders.length - 1)
        assert.ok(!ordersAtEnd.some(order => order.id === orderToDelete.id))
    })
})

after(async () => {
    await MenuItem.deleteMany({})
    await Order.deleteMany({})
    await mongoose.connection.close()
})
