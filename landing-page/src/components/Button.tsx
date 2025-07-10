import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline'
  size?: 'default' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500'

  const variantClasses = {
    default:
      'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white',
    outline:
      'border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white',
  }

  const sizeClasses = {
    default: 'px-4 py-2 text-sm',
    lg: 'px-8 py-4 text-lg',
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
