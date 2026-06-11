import React from 'react'
import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth()
  const userRole = String(user?.role || '').trim().toLowerCase()
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase())

  if (loading) {
    return <div className="loading"></div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!normalizedAllowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
