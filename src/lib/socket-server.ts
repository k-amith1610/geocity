import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db } from './fireBaseConfig';
import { collection, onSnapshot, query, orderBy, where, Timestamp, deleteDoc, doc } from 'firebase/firestore';

interface ReportData {
  id: string;
  createdAt?: Timestamp;
  expirationHours?: number;
  location?: string;
  isEmergency?: boolean;
  emergencyType?: string;
}

// Export for CommonJS compatibility
module.exports = { initializeSocketServer };

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Store connected clients
  const connectedClients = new Set<string>();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    connectedClients.add(socket.id);

    // Send current reports to new client
    socket.emit('reports-updated', { type: 'initial' });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      connectedClients.delete(socket.id);
    });

    // Handle report submission
    socket.on('report-submitted', (reportData) => {
      console.log('New report submitted:', reportData.id);
      // Broadcast to all other clients
      socket.broadcast.emit('reports-updated', {
        type: 'new-report',
        report: reportData
      });
    });

    // Handle report deletion
    socket.on('report-expired', (reportId) => {
      console.log('Report expired:', reportId);
      // Broadcast to all clients
      io.emit('reports-updated', {
        type: 'report-expired',
        reportId: reportId
      });
    });
  });

  // Set up real-time Firestore listener
  const reportsRef = collection(db, 'raised-issue');
  const q = query(reportsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    })) as ReportData[];

    // Check for expired reports
    const now = new Date();
    const expiredReports = reports.filter(report => {
      if (!report.createdAt) return false;
      
      const createdAt = report.createdAt.toDate();
      const expirationHours = report.expirationHours || 24;
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      
      return expiresAt <= now;
    });

    // Delete expired reports
    expiredReports.forEach(async (report) => {
      try {
        await deleteDoc(doc(db, 'raised-issue', report.id));
        console.log('Deleted expired report:', report.id);
        
        // Notify all clients about expired report
        io.emit('reports-updated', {
          type: 'report-expired',
          reportId: report.id
        });
      } catch (error) {
        console.error('Error deleting expired report:', error);
      }
    });

    // Send updated reports to all clients
    const activeReports = reports.filter(report => {
      if (!report.createdAt) return false;
      
      const createdAt = report.createdAt.toDate();
      const expirationHours = report.expirationHours || 24;
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      
      return expiresAt > now;
    });

    io.emit('reports-updated', {
      type: 'reports-list',
      reports: activeReports
    });
  }, (error) => {
    console.error('Firestore listener error:', error);
  });

  return { io, unsubscribe };
} 