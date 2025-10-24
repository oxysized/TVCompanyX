import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { dbService } from '../lib/db';
import type { DatabaseStatus } from '../lib/db';

interface DatabaseStatusProps {
  onStatusChange: (connected: boolean) => void;
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const checkDatabase = async () => {
    setLoading(true);
    try {
      const dbStatus = await dbService.checkConnection();
      setStatus(dbStatus);
      onStatusChange(dbStatus.connected);
      
      if (!dbStatus.connected && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkDatabase();
        }, 2000);
      }
    } catch (error) {
      console.error('Database check failed:', error);
      setStatus({
        connected: false,
        error: 'Failed to check database connection'
      });
      onStatusChange(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Проверка подключения к базе данных</h2>
          <p className="text-gray-600">Пожалуйста, подождите...</p>
          {retryCount > 0 && (
            <p className="text-sm text-orange-600 mt-2">
              Попытка {retryCount} из {maxRetries}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="max-w-md mx-auto text-center p-6">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ошибка подключения к базе данных
          </h2>
          <p className="text-gray-600 mb-4">
            {status?.error || 'Не удалось подключиться к базе данных'}
          </p>
          <div className="space-y-2">
            <button
              onClick={checkDatabase}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Попробовать снова
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Обновить страницу
            </button>
          </div>
          {retryCount >= maxRetries && (
            <p className="text-sm text-red-600 mt-4">
              Превышено максимальное количество попыток. Проверьте настройки базы данных.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2 shadow-sm">
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
        <div>
          <p className="text-sm font-medium text-green-800">База данных подключена</p>
          {status.responseTime && (
            <p className="text-xs text-green-600">
              Время отклика: {status.responseTime}мс
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseStatus;
