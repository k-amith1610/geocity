import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/fireBaseConfig';
import { geocodeLocation } from '@/lib/firestore-utils';

interface MigrationStatus {
  isRunning: boolean;
  lastRun: Date | null;
  totalReports: number;
  migratedCount: number;
  errorCount: number;
  skippedCount: number;
  isNeeded: boolean;
}

export function useAutoMigration() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    isRunning: false,
    lastRun: null,
    totalReports: 0,
    migratedCount: 0,
    errorCount: 0,
    skippedCount: 0,
    isNeeded: false
  });

  // Check if migration is needed
  const checkMigrationNeeded = useCallback(async () => {
    try {
      console.log('🔍 Checking if coordinates migration is needed...');
      
      const reportsRef = collection(db, 'raised-issue');
      const snapshot = await getDocs(reportsRef);
      
      let reportsWithoutCoordinates = 0;
      let totalReports = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        totalReports++;
        const reportData = docSnapshot.data();
        const coordinates = reportData.coordinates;
        
        if (!coordinates || !coordinates.lat || !coordinates.lng) {
          reportsWithoutCoordinates++;
        }
      });
      
      const isNeeded = reportsWithoutCoordinates > 0;
      
      console.log(`📊 Migration check: ${reportsWithoutCoordinates}/${totalReports} reports need coordinates`);
      
      setMigrationStatus(prev => ({
        ...prev,
        totalReports,
        isNeeded,
        lastRun: isNeeded ? null : prev.lastRun
      }));
      
      return isNeeded;
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      return false;
    }
  }, []);

  // Run migration automatically
  const runMigration = useCallback(async () => {
    if (migrationStatus.isRunning) {
      console.log('⏳ Migration already running, skipping...');
      return;
    }

    try {
      console.log('🚀 Starting automatic coordinates migration...');
      setMigrationStatus(prev => ({ ...prev, isRunning: true }));

      const reportsRef = collection(db, 'raised-issue');
      const snapshot = await getDocs(reportsRef);
      
      let migratedCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      let totalReports = snapshot.docs.length;

      console.log(`📋 Processing ${totalReports} total reports`);

      for (const docSnapshot of snapshot.docs) {
        try {
          const reportData = docSnapshot.data();
          const location = reportData.location;
          const existingCoordinates = reportData.coordinates;

          // Skip if already has coordinates
          if (existingCoordinates && existingCoordinates.lat && existingCoordinates.lng) {
            skippedCount++;
            continue;
          }

          // Skip if no location
          if (!location) {
            console.log(`⚠️ Report ${docSnapshot.id} has no location, skipping`);
            skippedCount++;
            continue;
          }

          console.log(`📍 Geocoding location for report ${docSnapshot.id}: ${location}`);

          // Geocode the location
          const coordinates = await geocodeLocation(location);
          
          if (coordinates) {
            // Update the document with coordinates
            await updateDoc(doc(db, 'raised-issue', docSnapshot.id), {
              coordinates: coordinates,
              lastUpdated: new Date()
            });
            
            migratedCount++;
            console.log(`✅ Successfully migrated report ${docSnapshot.id}`);
            
            // Add a small delay to avoid overwhelming the geocoding API
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.log(`❌ Failed to geocode location for report ${docSnapshot.id}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing report ${docSnapshot.id}:`, error);
          errorCount++;
        }
      }

      const finalStatus = {
        isRunning: false,
        lastRun: new Date(),
        totalReports,
        migratedCount,
        errorCount,
        skippedCount,
        isNeeded: errorCount > 0 // If there were errors, migration might still be needed
      };

      setMigrationStatus(finalStatus);

      console.log(`✅ Migration completed: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);

      // If there were errors, schedule a retry
      if (errorCount > 0) {
        console.log('🔄 Scheduling retry for failed migrations...');
        setTimeout(() => {
          checkMigrationNeeded().then(isNeeded => {
            if (isNeeded) {
              console.log('🔄 Retrying migration after delay...');
              runMigration();
            }
          });
        }, 30000); // Retry after 30 seconds
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
      setMigrationStatus(prev => ({
        ...prev,
        isRunning: false,
        errorCount: prev.errorCount + 1
      }));
    }
  }, [migrationStatus.isRunning, checkMigrationNeeded]);

  // Auto-run migration when needed
  useEffect(() => {
    const autoRunMigration = async () => {
      const isNeeded = await checkMigrationNeeded();
      if (isNeeded && !migrationStatus.isRunning) {
        console.log('🤖 Auto-triggering migration...');
        runMigration();
      }
    };

    // Check on mount
    autoRunMigration();

    // Set up periodic checks (every 5 minutes)
    const interval = setInterval(autoRunMigration, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkMigrationNeeded, runMigration, migrationStatus.isRunning]);

  // Monitor for new reports that might need coordinates
  useEffect(() => {
    const checkNewReports = async () => {
      if (!migrationStatus.isRunning) {
        const isNeeded = await checkMigrationNeeded();
        if (isNeeded) {
          console.log('🆕 New reports detected without coordinates, triggering migration...');
          runMigration();
        }
      }
    };

    // Check every 2 minutes for new reports
    const interval = setInterval(checkNewReports, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkMigrationNeeded, runMigration, migrationStatus.isRunning]);

  return {
    migrationStatus,
    runMigration,
    checkMigrationNeeded
  };
} 