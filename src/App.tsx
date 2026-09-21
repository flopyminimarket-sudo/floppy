import React from 'react';
import { AppProvider, useApp } from './AppContext';
import { MainLayout } from './components/MainLayout';
import { Login } from './components/Login';
import { Toaster } from 'react-hot-toast';

const AppContent = () => {
  const { currentUser, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return <MainLayout />;
};

function App() {
  return (
    <AppProvider>
      <Toaster position="top-right" containerClassName="no-print" />
      <AppContent />
    </AppProvider>
  );
}

export default App;
