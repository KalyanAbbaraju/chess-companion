'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

// Dialog context types
type DialogType = 'prompt' | 'confirm' | 'alert';

interface DialogContextValue {
  openDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
}

interface DialogOptions {
  type: DialogType;
  title: string;
  message: string;
  initialValue?: string;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
}

// Create context
const DialogContext = createContext<DialogContextValue | null>(null);

// Context provider component
export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [inputValue, setInputValue] = useState('');

  const openDialog = (options: DialogOptions) => {
    setDialog(options);
    setInputValue(options.initialValue || '');
  };

  const closeDialog = () => {
    setDialog(null);
    setInputValue('');
  };

  const handleConfirm = () => {
    if (dialog) {
      // For prompt dialogs, pass the input value
      if (dialog.type === 'prompt') {
        dialog.onConfirm(inputValue);
      } else {
        dialog.onConfirm();
      }
      closeDialog();
    }
  };

  const handleCancel = () => {
    if (dialog && dialog.onCancel) {
      dialog.onCancel();
    }
    closeDialog();
  };

  // Dialog UI
  return (
    <DialogContext.Provider value={{ openDialog, closeDialog }}>
      {children}
      
      {/* Dialog overlay */}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
            {/* Dialog header */}
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-medium text-gray-900">{dialog.title}</h3>
            </div>
            
            {/* Dialog content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">{dialog.message}</p>
              
              {/* Input field for prompt dialogs */}
              {dialog.type === 'prompt' && (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirm();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
              )}
            </div>
            
            {/* Dialog footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleConfirm}
              >
                {dialog.type === 'confirm' || dialog.type === 'prompt' ? 'Confirm' : 'OK'}
              </button>
              
              {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

// Custom hook to use the dialog context
export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}; 