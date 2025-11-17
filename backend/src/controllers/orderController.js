const Order = require('../models/Order')

exports.createOrder = async (req, res) => {
    try {
        const order = new Order(req.body)
        await order.save()
        res.status(201).json(order)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ timeOrdered: -1 }) // Sort by most recent first
            .populate({
                path: 'cashier',
                select: 'username',
            })
            .populate({
                path: 'items.item',
                select: 'name type price item',
            })
            .exec()

        res.json(orders)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
        if (!order) return res.status(404).json({ message: 'Order not found' })
        res.json(order)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.updateOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if (!order) return res.status(404).json({ message: 'Order not found' })
        res.json(order)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }
}

exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id)
        if (!order) return res.status(404).json({ message: 'Order not found' })
        res.json({ message: 'Order deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}
