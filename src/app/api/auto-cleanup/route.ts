import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/fireBaseConfig';
import { collection, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const reportsRef = collection(db, 'raised-issue');
    const snapshot = await getDocs(reportsRef);
    const now = new Date();
    
    const expiredReports: string[] = [];
    
    snapshot.docs.forEach((docSnapshot) => {
      const report = docSnapshot.data();
      if (!report.createdAt) return;
      
      const createdAt = report.createdAt.toDate();
      const expirationHours = report.expirationHours || 24;
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      
      if (expiresAt <= now) {
        expiredReports.push(docSnapshot.id);
      }
    });
    
    // Delete expired reports
    const deletePromises = expiredReports.map(async (reportId) => {
      try {
        await deleteDoc(doc(db, 'raised-issue', reportId));
        console.log('Auto-cleanup: Deleted expired report:', reportId);
        return { id: reportId, status: 'deleted' };
      } catch (error) {
        console.error('Auto-cleanup: Error deleting report:', reportId, error);
        return { id: reportId, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    const results = await Promise.all(deletePromises);
    const deletedCount = results.filter(r => r.status === 'deleted').length;
    
    return NextResponse.json({
      success: true,
      message: `Auto-cleanup completed. Deleted ${deletedCount} expired reports.`,
      deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Auto-cleanup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Auto-cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const reportsRef = collection(db, 'raised-issue');
    const snapshot = await getDocs(reportsRef);
    const now = new Date();
    
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const expiredReports = reports.filter(report => {
      if (!report.createdAt) return false;
      
      const createdAt = report.createdAt.toDate();
      const expirationHours = report.expirationHours || 24;
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      
      return expiresAt <= now;
    });
    
    const activeReports = reports.filter(report => {
      if (!report.createdAt) return false;
      
      const createdAt = report.createdAt.toDate();
      const expirationHours = report.expirationHours || 24;
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      
      return expiresAt > now;
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        total: reports.length,
        active: activeReports.length,
        expired: expiredReports.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting auto-cleanup stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get auto-cleanup stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 