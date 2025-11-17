const express = require('express')
const menuItemController = require('../controllers/menuItemController')

const router = express.Router()

router.post('/', menuItemController.createMenuItem)
router.get('/', menuItemController.getAllMenuItems)
router.get('/:id', menuItemController.getMenuItemById)
router.put('/:id', menuItemController.updateMenuItem)
router.delete('/:id', menuItemController.deleteMenuItem)

module.exports = router