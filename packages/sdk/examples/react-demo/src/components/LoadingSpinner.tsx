import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${sizes[size]} animate-spin text-primary-500`} />
      {text && <span className="text-gray-600">{text}</span>}
    </div>
  )
}