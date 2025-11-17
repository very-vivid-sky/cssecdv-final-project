import { getAllItems, createItem, updateItem, deleteItem } from '../services/api'

export const itemManagementLoader = async () => {
    try {
        const response = await getAllItems()
        return response.data
    } catch (error) {
        console.error('Error fetching items:', error)
        return []
    }
}

export const itemManagementAction = async ({ request }) => {
    const formData = await request.formData()
    const action = formData.get('_action')

    switch (action) {
    case 'create':
        try {
            const itemData = Object.fromEntries(formData)
            delete itemData._action
            await createItem(itemData)
            return { success: true, message: 'Item created successfully' }
        } catch (error) {
            return { success: false, message: error.response.data.message }
        }
    case 'update':
        try {
            const itemData = Object.fromEntries(formData)
            const itemId = itemData.id
            delete itemData._action
            delete itemData.id
            await updateItem(itemId, itemData)
            return { success: true, message: 'Item updated successfully' }
        } catch (error) {
            return { success: false, message: error.response.data.message }
        }
    case 'delete':
        try {
            const itemId = formData.get('id')
            await deleteItem(itemId)
            return { success: true, message: 'Item deleted successfully' }
        } catch (error) {
            return { success: false, message: 'Error deleting item', error }
        }
    default:
        return { success: false, message: 'Invalid action' }
    }
}
