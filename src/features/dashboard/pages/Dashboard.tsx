import React from 'react';
import { getStoredAuth } from '../../../utils/authStorage';
import { Navbar } from '../../../components/layout/Navbar';

export const DashboardPage: React.FC = () => {
  const { user } = getStoredAuth();

  if (!user) {
    // The route guard should normally prevent this, but keep a safe fallback.
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-10 pt-28">
        <section className="rounded-3xl bg-white px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)]">
          <h1 className="mb-4 text-xl font-semibold text-secondary">
            Bonjour, {user.firstname} {user.lastname}
          </h1>

          <div className="grid gap-4 text-[0.9rem] text-gray-700 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-500">Email</p>
              <p>{user.email}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Identifiant</p>
              <p>{user.identifier}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Téléphone</p>
              <p>{user.phone1 || '—'}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Rôle</p>
              <p>{user.role}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

