import React from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ResultCardProps {
  type: 'success' | 'error' | 'warning'
  title?: string
  children: React.ReactNode
  className?: string
}

export default function ResultCard({ type, title, children, className = '' }: ResultCardProps) {
  const baseClasses = 'p-6 rounded-xl border-2 fade-in'
  
  const typeClasses = {
    success: 'border-green-200 bg-green-50 text-green-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  }

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
  }

  const Icon = icons[type]

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5" />
          <h4 className="font-semibold text-lg">{title}</h4>
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}