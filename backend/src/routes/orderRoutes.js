const express = require('express')
const orderController = require('../controllers/orderController')

const router = express.Router()

router.post('/', orderController.createOrder)
router.get('/', orderController.getAllOrders)
router.get('/:id', orderController.getOrderById)
router.put('/:id', orderController.updateOrder)
router.delete('/:id', orderController.deleteOrder)

module.exports = router