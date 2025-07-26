'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export default function MigrationButton() {
  const [isMigrating, setIsMigrating] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();

  const handleMigration = async () => {
    if (isMigrating) return;

    setIsMigrating(true);
    showInfo('Migration Started', 'Starting coordinates migration for existing reports...');

    try {
      const response = await fetch('/api/migrate-coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(
          'Migration Completed', 
          `Successfully updated ${result.data.updatedCount} reports with coordinates. ${result.data.errorCount} errors occurred.`
        );
      } else {
        showError('Migration Failed', result.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Migration error:', error);
      showError('Migration Error', 'Failed to start migration. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <button
      onClick={handleMigration}
      disabled={isMigrating}
      className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-lg"
      title="Migrate existing reports with coordinates"
    >
      {isMigrating ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Migrating...</span>
        </div>
      ) : (
        <span>Migrate Coordinates</span>
      )}
    </button>
  );
} 