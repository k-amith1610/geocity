import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/fireBaseConfig';

interface ErrorRecoveryStatus {
  isChecking: boolean;
  lastCheck: Date | null;
  issuesFound: string[];
  issuesFixed: string[];
  isHealthy: boolean;
}

export function useAutoErrorRecovery() {
  const [recoveryStatus, setRecoveryStatus] = useState<ErrorRecoveryStatus>({
    isChecking: false,
    lastCheck: null,
    issuesFound: [],
    issuesFixed: [],
    isHealthy: true
  });

  // Check for common data issues and fix them automatically
  const checkAndFixIssues = useCallback(async () => {
    if (recoveryStatus.isChecking) {
      console.log('⏳ Error recovery already running, skipping...');
      return;
    }

    try {
      console.log('🔍 Starting automatic error detection and recovery...');
      setRecoveryStatus(prev => ({ ...prev, isChecking: true }));

      const issuesFound: string[] = [];
      const issuesFixed: string[] = [];

      // Check for reports with missing required fields
      const reportsRef = collection(db, 'raised-issue');
      const snapshot = await getDocs(reportsRef);
      
      let reportsChecked = 0;
      let reportsFixed = 0;

      for (const docSnapshot of snapshot.docs) {
        try {
          const reportData = docSnapshot.data();
          const reportId = docSnapshot.id;
          let needsUpdate = false;
          const updates: any = {};

          // Fix missing status
          if (!reportData.status) {
            updates.status = 'PENDING';
            issuesFound.push(`Report ${reportId}: Missing status`);
            needsUpdate = true;
          }

          // Fix missing priority
          if (!reportData.priority) {
            updates.priority = reportData.isEmergency ? 'high' : 'medium';
            issuesFound.push(`Report ${reportId}: Missing priority`);
            needsUpdate = true;
          }

          // Fix missing expirationHours
          if (!reportData.expirationHours) {
            updates.expirationHours = 24;
            issuesFound.push(`Report ${reportId}: Missing expiration hours`);
            needsUpdate = true;
          }

          // Fix missing createdAt timestamp
          if (!reportData.createdAt) {
            updates.createdAt = new Date();
            issuesFound.push(`Report ${reportId}: Missing creation timestamp`);
            needsUpdate = true;
          }

          // Fix missing lastUpdated
          if (!reportData.lastUpdated) {
            updates.lastUpdated = new Date();
            issuesFound.push(`Report ${reportId}: Missing last updated timestamp`);
            needsUpdate = true;
          }

          // Fix invalid emergency type
          if (reportData.isEmergency && !reportData.emergencyType) {
            updates.emergencyType = 'MEDICAL';
            issuesFound.push(`Report ${reportId}: Emergency report missing emergency type`);
            needsUpdate = true;
          }

          // Apply fixes if needed
          if (needsUpdate) {
            await updateDoc(doc(db, 'raised-issue', reportId), updates);
            reportsFixed++;
            issuesFixed.push(`Report ${reportId}: Fixed ${Object.keys(updates).length} issues`);
            console.log(`✅ Fixed issues for report ${reportId}`);
          }

          reportsChecked++;

        } catch (error) {
          console.error(`❌ Error checking report ${docSnapshot.id}:`, error);
          issuesFound.push(`Report ${docSnapshot.id}: Error during check`);
        }
      }

      const finalStatus = {
        isChecking: false,
        lastCheck: new Date(),
        issuesFound,
        issuesFixed,
        isHealthy: issuesFound.length === 0
      };

      setRecoveryStatus(finalStatus);

      console.log(`✅ Error recovery completed: ${reportsChecked} reports checked, ${reportsFixed} reports fixed`);
      console.log(`📊 Issues found: ${issuesFound.length}, Issues fixed: ${issuesFixed.length}`);

      // If issues were found and fixed, schedule another check
      if (issuesFound.length > 0) {
        console.log('🔄 Scheduling follow-up check...');
        setTimeout(() => {
          checkAndFixIssues();
        }, 60000); // Check again after 1 minute
      }

    } catch (error) {
      console.error('❌ Error recovery failed:', error);
      setRecoveryStatus(prev => ({
        ...prev,
        isChecking: false,
        issuesFound: [...prev.issuesFound, 'Error recovery process failed']
      }));
    }
  }, [recoveryStatus.isChecking]);

  // Auto-run error recovery
  useEffect(() => {
    const autoRunRecovery = async () => {
      if (!recoveryStatus.isChecking) {
        await checkAndFixIssues();
      }
    };

    // Check on mount
    autoRunRecovery();

    // Set up periodic checks (every 10 minutes)
    const interval = setInterval(autoRunRecovery, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkAndFixIssues, recoveryStatus.isChecking]);

  // Monitor for new reports and check them immediately
  useEffect(() => {
    const checkNewReports = async () => {
      if (!recoveryStatus.isChecking) {
        // Quick check for new reports that might have issues
        try {
          const reportsRef = collection(db, 'raised-issue');
          const recentQuery = query(
            reportsRef,
            where('lastUpdated', '>=', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
          );
          const snapshot = await getDocs(recentQuery);
          
          if (!snapshot.empty) {
            console.log('🆕 New reports detected, running quick health check...');
            checkAndFixIssues();
          }
        } catch (error) {
          console.error('❌ Error checking new reports:', error);
        }
      }
    };

    // Check every 3 minutes for new reports
    const interval = setInterval(checkNewReports, 3 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkAndFixIssues, recoveryStatus.isChecking]);

  return {
    recoveryStatus,
    checkAndFixIssues
  };
} 