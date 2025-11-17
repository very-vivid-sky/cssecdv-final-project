const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (user) => {
    return new Promise((resolve, reject) => {
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
        }

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // make sure it is in .env file
            { expiresIn: '1d' }, // 1 day
            (err, token) => {
                if (err) {
                    reject(new Error('Error signing token: ' + err.message))
                }
                resolve(token)
            },
        )
    })
}

const verifyToken = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                reject(new Error('Invalid token: ' + err.message))
            }
            resolve(decoded)
        })
    })

}

const findUserByJwt = async (token) => {
    try {
        const decoded = await verifyToken(token)
        const user = await User.findById(decoded.id)
        if (!user) {
            throw new Error('User not found')
        }
        return user
    } catch (error) {
        throw error
    }
}

module.exports = {
    signToken,
    verifyToken,
    findUserByJwt,
}