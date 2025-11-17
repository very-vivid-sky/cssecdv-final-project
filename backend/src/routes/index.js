const express = require('express')

const userRoutes = require('./userRoutes')
const loginRoutes = require('./loginRoutes')
const menuItemRoutes = require('./menuItemRoutes')
const orderRoutes = require('./orderRoutes')
const statisticsRoutes = require('./statisticsRoutes')

const router = express.Router()
router.use('/users', userRoutes)
router.use('/login', loginRoutes)
router.use('/menu-items', menuItemRoutes)
router.use('/orders', orderRoutes)
router.use('/statistics', statisticsRoutes)

module.exports = router
