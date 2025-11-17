const User = require('../models/User')
const jwtHandler = require('../utils/jwtHandler')
const bcrypt = require('bcryptjs')

exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(401).json({ message: 'Username not found' })
        }

        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password' })
        }

        const token = await jwtHandler.signToken(user)

        res.status(200).json({
            token,
            username: user.username,
            role: user.role,
            id: user.id,
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}
