import { Navigate, useLoaderData } from 'react-router-dom'

function ProtectedRoute({ children, requiredRole = null }) {
    const user = useLoaderData()

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/" replace />
    }

    return children
}

export default ProtectedRoute
