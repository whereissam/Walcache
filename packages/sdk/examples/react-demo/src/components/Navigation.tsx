import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Upload, 
  Info, 
  Globe, 
  Shield, 
  BarChart3, 
  Layers,
  Code
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Upload Asset', path: '/upload', icon: Upload },
  { name: 'Asset Info', path: '/asset-info', icon: Info },
  { name: 'Multi-Chain URLs', path: '/urls', icon: Globe },
  { name: 'Verification', path: '/verify', icon: Shield },
  { name: 'Metrics', path: '/metrics', icon: BarChart3 },
  { name: 'Use Cases', path: '/use-cases', icon: Layers },
  { name: 'Integration', path: '/integration', icon: Code },
]

export default function Navigation() {
  return (
    <nav className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-2">
      <div className="flex flex-wrap justify-center gap-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-white text-primary-700 shadow-lg'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.name}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}