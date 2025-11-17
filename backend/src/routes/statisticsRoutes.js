const express = require('express')
const statisticsController = require('../controllers/statisticsController')

const router = express.Router()

router.get('/', statisticsController.getDashboardStats)

module.exports = router
