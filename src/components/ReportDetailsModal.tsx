'use client';

import { useState, useEffect } from 'react';
import { X, Clock, MapPin, AlertTriangle, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Report } from '@/hooks/useReportsRealtime';

interface ReportDetailsModalProps {
  isOpen: boolean;
  report: Report | null;
  onClose: () => void;
}

export function ReportDetailsModal({ isOpen, report, onClose }: ReportDetailsModalProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [currentReportIndex, setCurrentReportIndex] = useState(0);

  // Get all reports from cluster if available
  const allReports = (report as any)?._allReportsFromCluster || [report];
  const currentReport = allReports[currentReportIndex];
  const hasMultipleReports = allReports.length > 1;

  // Reset index when modal opens with new report
  useEffect(() => {
    if (report) {
      setCurrentReportIndex(0);
    }
  }, [report]);

  // Calculate time remaining for current report
  useEffect(() => {
    if (!currentReport || !currentReport.createdAt) {
      setTimeRemaining('Unknown');
      return;
    }

    const updateTimeRemaining = () => {
      const createdAt = currentReport.createdAt.toDate();
      const expirationHours = currentReport.expirationHours || 24;
      const expiresAt = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentReport]);

  if (!isOpen || !currentReport) return null;

  const getPriorityColor = () => {
    if (currentReport.isEmergency) return 'text-red-600';
    if (currentReport.imageAnalysis?.category === 'DANGER') return 'text-red-600';
    if (currentReport.imageAnalysis?.category === 'WARNING') return 'text-yellow-600';
    return 'text-green-600';
  };

  const getPriorityIcon = () => {
    if (currentReport.isEmergency) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (currentReport.imageAnalysis?.category === 'DANGER') return <AlertCircle className="w-5 h-5 text-red-600" />;
    if (currentReport.imageAnalysis?.category === 'WARNING') return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getEmergencyTypeLabel = () => {
    switch (currentReport.emergencyType) {
      case 'MEDICAL': return 'Medical Emergency';
      case 'LAW_ENFORCEMENT': return 'Law Enforcement';
      case 'FIRE_HAZARD': return 'Fire & Hazard';
      case 'ENVIRONMENTAL': return 'Environmental Hazard';
      default: return 'General Report';
    }
  };

  const goToNextReport = () => {
    setCurrentReportIndex((prev) => (prev + 1) % allReports.length);
  };

  const goToPreviousReport = () => {
    setCurrentReportIndex((prev) => (prev - 1 + allReports.length) % allReports.length);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getPriorityIcon()}
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {currentReport.isEmergency ? 'Emergency Report' : 'Citizen Report'}
                {hasMultipleReports && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({currentReportIndex + 1} of {allReports.length})
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-600">
                {getEmergencyTypeLabel()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation for multiple reports */}
        {hasMultipleReports && (
          <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
            <button
              onClick={goToPreviousReport}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="text-sm text-gray-500">
              Report {currentReportIndex + 1} of {allReports.length}
            </span>
            <button
              onClick={goToNextReport}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Image */}
          {currentReport.photo && (
            <div>
              <img
                src={currentReport.photo}
                alt="Report"
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
              />
            </div>
          )}

          {/* Location */}
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Location</h3>
              <p className="text-sm text-gray-600">{currentReport.location}</p>
            </div>
          </div>

          {/* Description */}
          {currentReport.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{currentReport.description}</p>
            </div>
          )}

          {/* AI Analysis */}
          {currentReport.imageAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">AI Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-blue-700">Authenticity:</span>
                  <span className={`text-xs font-medium ${
                    currentReport.imageAnalysis.authenticity === 'REAL' ? 'text-green-600' : 
                    currentReport.imageAnalysis.authenticity === 'AI_GENERATED' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {currentReport.imageAnalysis.authenticity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-blue-700">Emergency Level:</span>
                  <span className={`text-xs font-medium ${getPriorityColor()}`}>
                    {currentReport.imageAnalysis.emergencyLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-blue-700">Category:</span>
                  <span className={`text-xs font-medium ${getPriorityColor()}`}>
                    {currentReport.imageAnalysis.category}
                  </span>
                </div>
                {currentReport.imageAnalysis.humanReadableDescription && (
                  <div className="mt-2">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      {currentReport.imageAnalysis.humanReadableDescription}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Time Information */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Reported: {currentReport.createdAt?.toDate().toLocaleString()}</span>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className={timeRemaining === 'Expired' ? 'text-red-600' : 'text-gray-600'}>
              {timeRemaining}
            </span>
          </div>

          {/* Report Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Report Details</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium">{currentReport.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Priority:</span>
                <span className="font-medium">{currentReport.priority}</span>
              </div>
              <div className="flex justify-between">
                <span>Expiration:</span>
                <span className="font-medium">{currentReport.expirationHours || 24} hours</span>
              </div>
              {currentReport.userId && (
                <div className="flex justify-between">
                  <span>User ID:</span>
                  <span className="font-medium">{currentReport.userId.substring(0, 8)}...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 