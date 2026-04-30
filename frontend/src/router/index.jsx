import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PrivateRoute, RoleRoute, GuestRoute } from './guards'

// Public
import Home from '../pages/public/Home'
import Login from '../pages/public/Login'
import Register from '../pages/public/Register'
import CarwashDetail from '../pages/public/CarwashDetail'

// Client
import Bookings from '../pages/client/Bookings'
import BookingDetail from '../pages/client/BookingDetail'
import Cars from '../pages/client/Cars'
import Favorites from '../pages/client/Favorites'
import Profile from '../pages/client/Profile'

// Operator
import Dashboard from '../pages/operator/Dashboard'
import Slots from '../pages/operator/Slots'
import Services from '../pages/operator/Services'
import CarwashProfile from '../pages/operator/CarwashProfile'

const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────
  { path: '/', element: <Home /> },
  { path: '/carwashes/:id', element: <CarwashDetail /> },
  {
    path: '/login',
    element: <GuestRoute><Login /></GuestRoute>
  },
  {
    path: '/register',
    element: <GuestRoute><Register /></GuestRoute>
  },

  // ── Client routes ────────────────────────────────────────────────────────
  {
    path: '/bookings',
    element: <RoleRoute role="client"><Bookings /></RoleRoute>
  },
  {
    path: '/bookings/:id',
    element: <RoleRoute role="client"><BookingDetail /></RoleRoute>
  },
  {
    path: '/cars',
    element: <RoleRoute role="client"><Cars /></RoleRoute>
  },
  {
    path: '/favorites',
    element: <RoleRoute role="client"><Favorites /></RoleRoute>
  },
  {
    path: '/profile',
    element: <PrivateRoute><Profile /></PrivateRoute>
  },

  // ── Operator routes ──────────────────────────────────────────────────────
  {
    path: '/operator/dashboard',
    element: <RoleRoute role="owner"><Dashboard /></RoleRoute>
  },
  {
    path: '/operator/slots',
    element: <RoleRoute role="owner"><Slots /></RoleRoute>
  },
  {
    path: '/operator/services',
    element: <RoleRoute role="owner"><Services /></RoleRoute>
  },
  {
    path: '/operator/carwash',
    element: <RoleRoute role="owner"><CarwashProfile /></RoleRoute>
  },
])

export default function Router() {
  return <RouterProvider router={router} />
}