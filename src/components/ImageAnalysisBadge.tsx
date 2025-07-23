'use client';

import { CheckCircle, XCircle, AlertTriangle, Shield, Eye, Loader2 } from 'lucide-react';
import { AnalyzeImageOutput } from '@/ai/flows/analyze-report-image-flow';

interface ImageAnalysisBadgeProps {
  analysis: AnalyzeImageOutput | null;
  isLoading?: boolean;
}

export default function ImageAnalysisBadge({ analysis, isLoading = false }: ImageAnalysisBadgeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg">
        <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
        <span className="text-sm text-gray-600 font-medium">Analyzing image...</span>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // Validate that we have the required fields
  if (!analysis.authenticity || !analysis.emergencyLevel) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          Analysis incomplete. Please try uploading the image again.
        </p>
      </div>
    );
  }

  // Authenticity badge configuration
  const getAuthenticityConfig = (authenticity: string) => {
    switch (authenticity) {
      case 'REAL':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Real Photo',
          textColor: 'text-green-700'
        };
      case 'AI_GENERATED':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'AI Generated',
          textColor: 'text-red-700'
        };
      case 'UNCERTAIN':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Uncertain',
          textColor: 'text-yellow-700'
        };
      default:
        return {
          icon: Eye,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Unknown',
          textColor: 'text-gray-700'
        };
    }
  };

  // Emergency level badge configuration
  const getEmergencyConfig = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          icon: Shield,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Critical Emergency',
          textColor: 'text-red-700'
        };
      case 'HIGH':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          text: 'High Priority',
          textColor: 'text-orange-700'
        };
      case 'MEDIUM':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Medium Priority',
          textColor: 'text-yellow-700'
        };
      case 'LOW':
        return {
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Low Priority',
          textColor: 'text-blue-700'
        };
      case 'NONE':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'No Emergency',
          textColor: 'text-green-700'
        };
      default:
        return {
          icon: Eye,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Unknown',
          textColor: 'text-gray-700'
        };
    }
  };

  const authenticityConfig = getAuthenticityConfig(analysis.authenticity);
  const emergencyConfig = getEmergencyConfig(analysis.emergencyLevel);
  const AuthenticityIcon = authenticityConfig.icon;
  const EmergencyIcon = emergencyConfig.icon;

  return (
    <div className="space-y-3">
      {/* Authenticity Badge */}
      <div className={`flex items-center space-x-2 px-3 py-2 ${authenticityConfig.bgColor} ${authenticityConfig.borderColor} border rounded-lg`}>
        <AuthenticityIcon className={`w-4 h-4 ${authenticityConfig.color}`} />
        <span className={`text-sm font-medium ${authenticityConfig.textColor}`}>
          {authenticityConfig.text}
        </span>
        {analysis.confidence > 0 && (
          <span className="text-xs text-gray-500">
            ({analysis.confidence}% confidence)
          </span>
        )}
      </div>

      {/* Emergency Level Badge */}
      <div className={`flex items-center space-x-2 px-3 py-2 ${emergencyConfig.bgColor} ${emergencyConfig.borderColor} border rounded-lg`}>
        <EmergencyIcon className={`w-4 h-4 ${emergencyConfig.color}`} />
        <span className={`text-sm font-medium ${emergencyConfig.textColor}`}>
          {emergencyConfig.text}
        </span>
      </div>

      {/* Image Description */}
      {analysis.description && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Image Analysis</h4>
          <p className="text-sm text-blue-800 leading-relaxed">
            {analysis.description}
          </p>
        </div>
      )}

      {/* Reasoning (if not real) */}
      {analysis.authenticity !== 'REAL' && analysis.reasoning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-yellow-900 mb-1">Analysis Note</h4>
          <p className="text-sm text-yellow-800">
            {analysis.reasoning}
          </p>
        </div>
      )}
    </div>
  );
} 