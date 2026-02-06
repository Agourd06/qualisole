import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/Login';
import { SequencePage } from '../features/sequence/pages/SequencePage';
import { QualiphotoPage } from '../features/ged/pages/QualiphotoPage';
import { SuiviPage } from '../features/ged/pages/SuiviPage';
import { ChantierPage } from '../features/chantier/pages/ChantierPage';
import { RequireAuth } from './RequireAuth';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/sequence" element={<SequencePage />} />
          <Route path="/qualiphoto" element={<QualiphotoPage />} />
          <Route path="/suivi" element={<SuiviPage />} />
          <Route path="/chantier" element={<ChantierPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/sequence" replace />} />
        <Route path="*" element={<Navigate to="/sequence" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

