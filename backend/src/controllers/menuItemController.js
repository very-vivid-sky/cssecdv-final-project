const MenuItem = require('../models/MenuItem')

exports.createMenuItem = async (req, res) => {
    try {
        const menuItem = new MenuItem(req.body)
        await menuItem.save()
        res.status(201).json(menuItem)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

exports.getAllMenuItems = async (req, res) => {
    try {
        const menuItems = await MenuItem.find({})
        res.json(menuItems)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getMenuItemById = async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' })
        res.json(menuItem)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.updateMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' })
        res.json(menuItem)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

exports.deleteMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndDelete(req.params.id)
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' })
        res.json({ message: 'Menu item deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}