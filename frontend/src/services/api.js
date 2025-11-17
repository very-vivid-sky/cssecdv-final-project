import axios from 'axios'

const BASE_URL = '/api'

// users
export const createUser = (userData) => axios.post(`${BASE_URL}/users`, userData)
export const getAllUsers = () => axios.get(`${BASE_URL}/users`)
export const getUserById = (id) => axios.get(`${BASE_URL}/users/${id}`)
export const updateUser = (id, userData) => axios.put(`${BASE_URL}/users/${id}`, userData)
export const deleteUser = (id) => axios.delete(`${BASE_URL}/users/${id}`)

// login
export const loginUser = (username, password) => axios.post(`${BASE_URL}/login`, { username, password })

// items
export const createItem = (itemData) => axios.post(`${BASE_URL}/menu-items`, itemData)
export const getAllItems = () => axios.get(`${BASE_URL}/menu-items`)
export const getItemById = (id) => axios.get(`${BASE_URL}/menu-items/${id}`)
export const updateItem = (id, itemData) => axios.put(`${BASE_URL}/menu-items/${id}`, itemData)
export const deleteItem = (id) => axios.delete(`${BASE_URL}/menu-items/${id}`)

// orders
export const createOrder = (orderData) => axios.post(`${BASE_URL}/orders`, orderData)
export const getAllOrders = () => axios.get(`${BASE_URL}/orders`)
export const getOrderById = (id) => axios.get(`${BASE_URL}/orders/${id}`)
export const updateOrder = (id, orderData) => axios.put(`${BASE_URL}/orders/${id}`, orderData)
export const deleteOrder = (id) => axios.delete(`${BASE_URL}/orders/${id}`)

// statistics
export const getStatistics = () => axios.get(`${BASE_URL}/statistics`)
