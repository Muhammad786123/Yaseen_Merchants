import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [direction, setDirectionState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('layout_direction') || 'rtl';
    }
    return 'rtl';
  });

  const setDirection = (newDir) => {
    const val = newDir === 'ltr' ? 'ltr' : 'rtl';
    setDirectionState(val);
    try {
      localStorage.setItem('layout_direction', val);
    } catch {
      // ignore
    }
  };

  const toggleDirection = () => {
    setDirection(direction === 'rtl' ? 'ltr' : 'rtl');
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = direction === 'rtl' ? 'ur' : 'en';
    }
  }, [direction]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  return (
    <AppContext.Provider value={{ showToast, toast, direction, setDirection, toggleDirection }}>
      {children}
      {toast && (
        <div className="fixed bottom-5 end-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-600 text-white'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
