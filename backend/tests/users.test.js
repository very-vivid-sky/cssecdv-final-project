const { test, describe, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('./../src/app')
const mongoose = require('mongoose')
const User = require('./../src/models/User')

const initialUsers = [
    {
        username: 'cashier1',
        password: 'password123',
        role: 'cashier',
    },
    {
        username: 'manager1',
        password: 'strongpassword456',
        role: 'manager',
    },
]

const api = supertest(app)

beforeEach(async () => {
    try {
        await User.deleteMany({})
        // Use a for...of loop for asynchronous operations:
        for (const user of initialUsers) {
            const newUser = new User(user)
            await newUser.save() // This will trigger pre('save') hooks
        }

    } catch (error) {
        console.error('Error in beforeEach:', error)
    }
})

describe('User API tests', () => {
    test('GET /api/users returns all users', async () => {
        const response = await api.get('/api/users')
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.length, initialUsers.length)
    })

    test('GET /api/users/:id returns a specific user', async () => {
        const users = await User.find({})
        const userToGet = users[0]

        const response = await api.get(`/api/users/${userToGet.id}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.username, userToGet.username)
    })

    test('POST /api/users creates a new user', async () => {
        const newUser = {
            username: 'newuser',
            password: 'newpassword',
            role: 'cashier',
        }

        await api.post('/api/users')
            .send(newUser)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await User.find({})
        assert.strictEqual(usersAtEnd.length, initialUsers.length + 1)

        const usernames = usersAtEnd.map(u => u.username)
        assert(usernames.includes(newUser.username))
    })

    test('PUT /api/users/:id updates a user', async () => {
        const users = await User.find({})
        const userToUpdate = users[0]

        const updatedInfo = {
            username: 'updateduser',
            role: 'manager',
        }

        await api.put(`/api/users/${userToUpdate.id}`)
            .send(updatedInfo)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const updatedUser = await User.findById(userToUpdate.id)
        assert.strictEqual(updatedUser.username, updatedInfo.username)
        assert.strictEqual(updatedUser.role, updatedInfo.role)
    })

    test('DELETE /api/users/:id deletes a user', async () => {
        const users = await User.find({})
        const userToDelete = users[0]

        await api.delete(`/api/users/${userToDelete.id}`)
            .expect(200)

        const usersAtEnd = await User.find({})
        assert.strictEqual(usersAtEnd.length, initialUsers.length - 1)

        const usernames = usersAtEnd.map(u => u.username)
        assert(!usernames.includes(userToDelete.username))
    })

})

describe('Login API tests', () => {
    test('POST /api/login logs in with valid credentials', async () => {
        const credentials = {
            username: 'cashier1',
            password: 'password123',
        }

        const response = await api.post('/api/login')
            .send(credentials)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert(response.body.token) // Check if a token is returned
    })

    test('POST /api/login fails with incorrect password', async () => {
        const credentials = {
            username: 'cashier1',
            password: 'password12345',
        }

        const response = await api.post('/api/login')
            .send(credentials)
            .expect(401)

        assert.strictEqual(response.body.message, 'Incorrect password')

    })

    test('POST /api/login fails with non-existent user', async () => {
        const credentials = {
            username: 'nonexistentuser',
            password: 'somepassword',
        }

        const response = await api.post('/api/login')
            .send(credentials)
            .expect(401)

        assert.strictEqual(response.body.message, 'Username not found')
    })

    test('POST /api/users fails with duplicate username', async () => {
        const existingUser = initialUsers[0]

        const duplicateUser = {
            username: existingUser.username,
            password: 'somepassword',
            role: 'cashier',
        }

        const response = await api.post('/api/users')
            .send(duplicateUser)
            .expect(400) // Expect a 400 Bad Request error
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.message, 'Username is already taken. Please choose a different username.')

        const usersAtEnd = await User.find({})
        assert.strictEqual(usersAtEnd.length, initialUsers.length)  // check that no new user was created

    })
})

after(async () => {
    await User.deleteMany({})
    await mongoose.connection.close()
})
