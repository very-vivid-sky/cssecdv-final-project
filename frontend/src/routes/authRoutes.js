import { loginUser } from '../services/api'
import { redirect } from 'react-router-dom'
import { checkAuth } from '../utils/auth'

export const loginLoader = async () => {
    const user = await checkAuth()
    if (user) {
        return redirect(user.role === 'manager' ? '/manager' : '/cashier')
    }
    return null
}

export const loginAction = async ({ request }) => {
    const formData = await request.formData()
    const username = formData.get('username')
    const password = formData.get('password')

    try {
        const response = await loginUser(username, password)
        localStorage.setItem('user', JSON.stringify(response.data))
        return redirect(response.data.role === 'manager' ? '/manager' : '/cashier')
    } catch (error) {
        return { error: error.response?.data?.message || 'An error occurred during login' }
    }
}

export const logoutAction = async () => {
    localStorage.removeItem('user')
    return redirect('/login')
}

export const rootLoader = async () => {
    const user = await checkAuth()
    if (!user) {
        return redirect('/login')
    }
    return redirect(user.role === 'manager' ? '/manager' : '/cashier')
}
