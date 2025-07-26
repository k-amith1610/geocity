import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/fireBaseConfig';
import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const issuesCollection = collection(db, 'raised-issue');
    const now = new Date();
    
    // Query for expired reports
    const expiredReportsQuery = query(
      issuesCollection,
      where('createdAt', '<=', Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000))) // Reports older than 24 hours
    );
    
    const expiredReportsSnapshot = await getDocs(expiredReportsQuery);
    const expiredReports: string[] = [];
    
    // Check each report for actual expiration based on expirationHours
    for (const doc of expiredReportsSnapshot.docs) {
      const reportData = doc.data();
      const createdAt = reportData.createdAt?.toDate();
      const expirationHours = reportData.expirationHours || 24;
      
      if (createdAt) {
        const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
        
        if (now >= expiresAt) {
          expiredReports.push(doc.id);
        }
      }
    }
    
    // Delete expired reports
    const deletePromises = expiredReports.map(reportId => {
      const docRef = doc(db, 'raised-issue', reportId);
      return deleteDoc(docRef);
    });
    
    await Promise.all(deletePromises);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${expiredReports.length} expired reports`,
      deletedCount: expiredReports.length,
      deletedReportIds: expiredReports,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error cleaning up expired reports:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clean up expired reports',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const issuesCollection = collection(db, 'raised-issue');
    const now = new Date();
    
    // Get all reports to analyze expiration
    const allReportsSnapshot = await getDocs(issuesCollection);
    const reports = allReportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const expiredReports = reports.filter(report => {
      const createdAt = report.createdAt?.toDate();
      const expirationHours = report.expirationHours || 24;
      
      if (!createdAt) return false;
      
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      return now >= expiresAt;
    });
    
    const activeReports = reports.filter(report => {
      const createdAt = report.createdAt?.toDate();
      const expirationHours = report.expirationHours || 24;
      
      if (!createdAt) return false;
      
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      return now < expiresAt;
    });
    
    return NextResponse.json({
      success: true,
      data: {
        totalReports: reports.length,
        activeReports: activeReports.length,
        expiredReports: expiredReports.length,
        expiredReportIds: expiredReports.map(r => r.id),
        cleanupEndpoint: '/api/cleanup-expired-reports',
        method: 'POST'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error analyzing reports:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze reports',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 