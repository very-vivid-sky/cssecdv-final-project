import { getAllUsers, createUser, updateUser, deleteUser } from '../services/api'

export const userManagementLoader = async () => {
    try {
        const response = await getAllUsers()
        return response.data
    } catch (error) {
        console.error('Error fetching users:', error)
        return []
    }
}

export const userManagementAction = async ({ request }) => {
    const formData = await request.formData()
    const action = formData.get('_action')

    switch (action) {
    case 'create':
        try {
            const userData = Object.fromEntries(formData)
            delete userData._action
            await createUser(userData)
            return { success: true, message: 'User created successfully' }
        } catch (error) {
            return { success: false, message: error.response.data.message }
        }
    case 'update':
        try {
            const userData = Object.fromEntries(formData)
            const userId = userData.id
            delete userData._action
            delete userData.id
            await updateUser(userId, userData)
            return { success: true, message: 'User updated successfully' }
        } catch (error) {
            return { success: false, message: error.response.data.message }
        }
    case 'delete':
        try {
            const userId = formData.get('id')
            await deleteUser(userId)
            return { success: true, message: 'User deleted successfully' }
        } catch (error) {
            return { success: false, message: 'Error deleting user', error }
        }
    default:
        return { success: false, message: 'Invalid action' }
    }
}
