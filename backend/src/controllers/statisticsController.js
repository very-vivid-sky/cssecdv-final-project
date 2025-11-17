const Order = require('../models/Order')
// const MenuItem = require('../models/MenuItem');
// const User = require('../models/User');

const statisticsController = {
    // Get all dashboard statistics
    getDashboardStats: async (req, res) => {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const [
                todayStats,
                weeklyStats,
                monthlyStats,
                topItems,
                paymentMethodStats,
                cashierPerformance,
                hourlyOrderDistribution,
            ] = await Promise.all([
                getTodayStats(today),
                getWeeklyStats(today),
                getMonthlyStats(today),
                getTopSellingItems(),
                getPaymentMethodStats(),
                getCashierPerformance(),
                getHourlyOrderDistribution(),
            ])

            res.json({
                today: todayStats,
                weekly: weeklyStats,
                monthly: monthlyStats,
                topSellingItems: topItems,
                paymentMethods: paymentMethodStats,
                cashierPerformance,
                hourlyDistribution: hourlyOrderDistribution,
            })
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    },
}

// Helper functions
async function getTodayStats(today) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayOrders = await Order.find({
        timeOrdered: {
            $gte: today,
            $lt: tomorrow,
        },
    })

    return {
        totalOrders: todayOrders.length,
        totalSales: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        averageOrderValue: todayOrders.length > 0
            ? todayOrders.reduce((sum, order) => sum + order.totalAmount, 0) / todayOrders.length
            : 0,
    }
}

async function getWeeklyStats(today) {
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const weeklyOrders = await Order.find({
        timeOrdered: {
            $gte: weekAgo,
            $lt: today,
        },
    })

    return {
        totalOrders: weeklyOrders.length,
        totalSales: weeklyOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        averageOrderValue: weeklyOrders.length > 0
            ? weeklyOrders.reduce((sum, order) => sum + order.totalAmount, 0) / weeklyOrders.length
            : 0,
    }
}

async function getMonthlyStats(today) {
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const monthlyOrders = await Order.find({
        timeOrdered: {
            $gte: monthAgo,
            $lt: today,
        },
    })

    return {
        totalOrders: monthlyOrders.length,
        totalSales: monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        averageOrderValue: monthlyOrders.length > 0
            ? monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0) / monthlyOrders.length
            : 0,
    }
}
async function getTopSellingItems() {
    const orders = await Order.find().populate('items.item')
    const itemCounts = {}

    orders.forEach(order => {
        order.items.forEach(item => {
            const itemId = item.item._id.toString()
            if (!itemCounts[itemId]) {
                itemCounts[itemId] = {
                    name: item.item.item,
                    quantity: 0,
                    revenue: 0,
                }
            }
            itemCounts[itemId].quantity += item.quantity
            itemCounts[itemId].revenue += item.quantity * item.item.price
        })
    })

    return Object.values(itemCounts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
}

async function getPaymentMethodStats() {
    const orders = await Order.find()
    const paymentStats = {
        GCash: 0,
        Cash: 0,
        Card: 0,
    }

    orders.forEach(order => {
        paymentStats[order.paymentMethod]++
    })

    return paymentStats
}

async function getCashierPerformance() {
    const orders = await Order.find().populate('cashier')
    const cashierStats = {}

    orders.forEach(order => {
        const cashierId = order.cashier._id.toString()
        if (!cashierStats[cashierId]) {
            cashierStats[cashierId] = {
                name: order.cashier.username,
                totalOrders: 0,
                totalSales: 0,
            }
        }
        cashierStats[cashierId].totalOrders++
        cashierStats[cashierId].totalSales += order.totalAmount
    })

    return Object.values(cashierStats)
        .sort((a, b) => b.totalSales - a.totalSales)
}

async function getHourlyOrderDistribution() {
    const orders = await Order.find()
    const hourlyDistribution = Array(24).fill(0)

    orders.forEach(order => {
        const hour = new Date(order.timeOrdered).getHours()
        hourlyDistribution[hour]++
    })

    return hourlyDistribution
}

module.exports = statisticsController
