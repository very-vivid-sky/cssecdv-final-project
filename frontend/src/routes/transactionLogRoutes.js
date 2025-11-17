import { getAllOrders, updateOrder, deleteOrder } from '../services/api'

export const transactionLogLoader = async () => {
    try {
        const response = await getAllOrders()
        return response.data
    } catch (error) {
        console.error('Error fetching orders:', error)
        return []
    }
}

export const transactionLogAction = async ({ request }) => {
    const formData = await request.formData()
    const action = formData.get('_action')

    switch (action) {
    case 'update':
        try {
            const orderData = Object.fromEntries(formData)
            const itemId = orderData.id
            delete orderData._action
            delete orderData.id
            await updateOrder(itemId, orderData)
            return { success: true, message: 'Transaction updated successfully' }
        } catch (error) {
            return { success: false, message: error.response.data.message }
        }
    case 'delete':
        try {
            const orderId = formData.get('id')
            await deleteOrder(orderId)
            return { success: true, message: 'Transaction deleted successfully' }
        } catch (error) {
            return { success: false, message: 'Error deleting transaction', error }
        }
    default:
        return { success: false, message: 'Invalid action' }
    }
}
