import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getStoredAuth } from '../utils/authStorage';

export const RequireAuth: React.FC = () => {
  const { token } = getStoredAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

