import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import Login from './components/Login'
import CashierView from './components/CashierView'
import ManagerView from './components/ManagerView'
import UserManagement from './components/UserManagement'
import ItemManagement from './components/ItemManagement'
import TransactionLog from './components/TransactionLog'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { loginLoader, loginAction, logoutAction, rootLoader } from './routes/authRoutes'
import { protectedLoader } from './routes/protectedRoutes'
import { userManagementLoader, userManagementAction } from './routes/userManagementRoutes'
import { itemManagementLoader, itemManagementAction } from './routes/itemManagementRoutes'
import { transactionLogLoader, transactionLogAction } from './routes/transactionLogRoutes'
import { statisticsLoader } from './routes/statisticsRoutes'
import { cashierLoader, cashierAction } from './routes/cashierRoutes'

const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
        action: loginAction,
        loader: loginLoader,
    },
    {
        path: '/cashier',
        element: <ProtectedRoute requiredRole="cashier"><Outlet /></ProtectedRoute>,
        loader: protectedLoader,
        children: [
            {
                index: true,
                element: <Navigate to="order-platform" replace />,
            },
            {
                path: 'order-platform',
                element: <CashierView />,
                loader: cashierLoader,
                action: cashierAction,
            },
        ],
    },
    {
        path: '/manager',
        element: <ProtectedRoute requiredRole="manager"><ManagerView /></ProtectedRoute>,
        loader: protectedLoader,
        children: [
            {
                path: 'users',
                element: <UserManagement />,
                loader: userManagementLoader,
                action: userManagementAction,
            },
            {
                path: 'menu-items',
                element: <ItemManagement />,
                loader: itemManagementLoader,
                action: itemManagementAction,
            },
            {
                path: 'transaction-log',
                element: <TransactionLog />,
                loader: transactionLogLoader,
                action: transactionLogAction,
            },
            {
                path: 'dashboard',
                element: <Dashboard />,
                loader: statisticsLoader,
            },
        ],
    },
    {
        path: '/logout',
        action: logoutAction,
    },
    {
        path: '/',
        loader: rootLoader,
    },
    {
        path: '*',
        element: <Navigate replace to="/" />,
    },
])

function App() {
    return (
        <RouterProvider router={router} />
    )
}

export default App
