import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/fireBaseConfig';
import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const reportsRef = collection(db, 'raised-issue');
    const now = new Date();
    
    // Get all reports
    const snapshot = await getDocs(reportsRef);
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
        console.log('Deleted expired report:', reportId);
        return { id: reportId, status: 'deleted' };
      } catch (error) {
        console.error('Error deleting report:', reportId, error);
        return { id: reportId, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    const results = await Promise.all(deletePromises);
    const deletedCount = results.filter(r => r.status === 'deleted').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} expired reports.`,
      details: {
        totalExpired: expiredReports.length,
        deleted: deletedCount,
        errors: errorCount,
        results: results
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in cleanup job:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup expired reports',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
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
      expiredReports: expiredReports.map(r => ({
        id: r.id,
        location: r.location,
        createdAt: r.createdAt?.toDate().toISOString(),
        expirationHours: r.expirationHours
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get cleanup stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 