const { test, describe, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../src/app')
const mongoose = require('mongoose')
const MenuItem = require('../src/models/MenuItem')

const initialMenuItems = [
    {
        type: 'Sandwiches',
        item: 'Chicken Shawarma',
        price: 130,
    },
    {
        type: 'Burgers',
        item: 'Classic Burger',
        price: 100,
    },
]

const api = supertest(app)

beforeEach(async () => {
    await MenuItem.deleteMany({})
    for (const menuItem of initialMenuItems) {
        const newMenuItem = new MenuItem(menuItem)
        await newMenuItem.save()
    }
})

describe('Menu Item API tests', () => {
    test('GET /api/menu-items returns all menu items', async () => {  // Adjust the path as needed
        const response = await api.get('/api/menu-items')
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.length, initialMenuItems.length)
    })

    test('GET /api/menu-items/:id returns a specific menu item', async () => {
        const menuItems = await MenuItem.find({})
        const menuItemToGet = menuItems[0]

        const response = await api.get(`/api/menu-items/${menuItemToGet.id}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.item, menuItemToGet.item)
        assert.strictEqual(response.body.price, menuItemToGet.price)
    })

    test('POST /api/menu-items creates a new menu item', async () => {
        const newMenuItem = {
            type: 'Drinks',
            item: 'Iced Tea',
            price: 50,
        }

        await api.post('/api/menu-items')
            .send(newMenuItem)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        const createdMenuItem = await MenuItem.findOne({ item: newMenuItem.item })

        assert.ok(createdMenuItem)
        assert.equal(createdMenuItem.type, newMenuItem.type)
        assert.equal(createdMenuItem.price, newMenuItem.price)
    })

    test('PUT /api/menu-items/:id updates a menu item', async () => {
        const menuItems = await MenuItem.find({})
        const menuItemToUpdate = menuItems[0]

        const updatedInfo = {
            item: 'Updated Shawarma',
            price: 140,
        }

        await api.put(`/api/menu-items/${menuItemToUpdate.id}`)
            .send(updatedInfo)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const updatedMenuItem = await MenuItem.findById(menuItemToUpdate.id)
        assert.strictEqual(updatedMenuItem.item, updatedInfo.item)
        assert.strictEqual(updatedMenuItem.price, updatedInfo.price)
    })

    test('DELETE /api/menu-items/:id deletes a menu item', async () => {
        const menuItems = await MenuItem.find({})
        const menuItemToDelete = menuItems[0]

        await api.delete(`/api/menu-items/${menuItemToDelete.id}`)
            .expect(200)

        const menuItemsAtEnd = await MenuItem.find({})
        assert.strictEqual(menuItemsAtEnd.length, initialMenuItems.length - 1)

        const items = menuItemsAtEnd.map(item => item.item)
        assert(!items.includes(menuItemToDelete.item))

    })
})

after(async () => {
    await MenuItem.deleteMany({})
    await mongoose.connection.close()
})