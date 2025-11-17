import { getAllItems, createOrder } from '../services/api'

export const cashierLoader = async () => {
    try {
        const response = await getAllItems()
        return response.data
    } catch (error) {
        console.error('Error fetching items:', error)
        return []
    }
}

export const cashierAction = async ({ request }) => {
    const formData = await request.formData()
    try {
        const orderDataString = formData.get('orderData')
        const orderData = JSON.parse(orderDataString)
        console.log(orderData)
        await createOrder(orderData)
        return { success: true, message: 'Order created successfully' }
    } catch (error) {
        return { success: false, message: error.response.data.message }
    }
}
