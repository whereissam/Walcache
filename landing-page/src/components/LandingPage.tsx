import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Button } from './Button'
import { ChevronRight, Zap, Shield, Globe, Waves, Database, Cloud, Server, Activity, ArrowRight, Rocket } from 'lucide-react'
import walcacheLogo from '../assets/walcache-logo.jpeg'

gsap.registerPlugin(ScrollTrigger)

// Brand colors extracted from the walrus logo
const BRAND_COLORS = {
  // Dark navy background from logo
  dark: '#1e293b',
  darker: '#0f172a', 
  // Walrus cyan-turquoise from logo
  primary: '#06b6d4',
  primaryLight: '#22d3ee',
  primaryDark: '#0891b2',
  // Emerald accent from logo
  secondary: '#10b981',
  secondaryLight: '#34d399',
  secondaryDark: '#059669',
  // Supporting colors
  accent: '#3b82f6',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDark: '#475569'
}

// Configuration for external links
const CONFIG = {
  MAIN_APP_URL: 'http://localhost:5173',
  DEMO_URL: 'http://localhost:5173/demo',
}

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)

  const handleLaunchApp = () => {
    window.open(CONFIG.MAIN_APP_URL, '_blank', 'noopener,noreferrer')
  }

  const handleViewDemo = () => {
    window.open(CONFIG.DEMO_URL, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    // Force dark background using brand colors
    document.documentElement.style.backgroundColor = BRAND_COLORS.darker
    document.body.style.backgroundColor = BRAND_COLORS.darker
    document.documentElement.classList.add('dark')
    
    return () => {
      document.documentElement.style.backgroundColor = ''
      document.body.style.backgroundColor = ''
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Enhanced particle system with brand colors
      const createParticles = () => {
        const particles = particlesRef.current
        if (!particles) return

        // Create fewer, more meaningful particles
        for (let i = 0; i < 30; i++) {
          const particle = document.createElement('div')
          particle.className = 'particle absolute rounded-full'
          
          // Use actual brand colors
          const colors = [BRAND_COLORS.primary, BRAND_COLORS.secondary, BRAND_COLORS.accent]
          const color = colors[Math.floor(Math.random() * colors.length)]
          
          const size = Math.random() * 6 + 2
          particle.style.width = size + 'px'
          particle.style.height = size + 'px'
          particle.style.background = color
          particle.style.boxShadow = `0 0 ${size * 2}px ${color}40`
          particle.style.left = Math.random() * 100 + '%'
          particle.style.top = Math.random() * 100 + '%'
          particles.appendChild(particle)

          gsap.set(particle, {
            opacity: Math.random() * 0.8 + 0.2
          })

          // Sophisticated movement pattern
          gsap.to(particle, {
            y: -300 - Math.random() * 200,
            x: Math.random() * 100 - 50,
            scale: 0,
            opacity: 0,
            duration: Math.random() * 4 + 3,
            repeat: -1,
            delay: Math.random() * 3,
            ease: 'power2.out'
          })
        }
      }

      createParticles()

      // Sophisticated hero entrance
      const tl = gsap.timeline()
      
      // Background entrance
      tl.from('.hero-section', {
        opacity: 0,
        duration: 1.5,
        ease: 'power2.out'
      })

      // Logo sophisticated animation (not just blinking)
      .from('.hero-logo-container', {
        scale: 0.3,
        rotation: 20,
        opacity: 0,
        duration: 1.2,
        ease: 'elastic.out(1, 0.6)',
        delay: -1
      })

      // Title with character animation
      .from('.hero-title', {
        y: 80,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: -0.6
      })

      // Subtitle with better visibility
      .from('.hero-subtitle', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: -0.3
      })

      // Buttons entrance
      .from('.hero-cta', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay: -0.1
      })

      // Sophisticated logo hover animation
      gsap.to('.hero-logo-image', {
        y: -10,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      })

      // Logo glow pulse
      gsap.to('.logo-glow', {
        opacity: 0.8,
        scale: 1.1,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      })

      // Speed lines with proper brand colors
      gsap.fromTo('.speed-line', 
        {
          scaleX: 0,
          transformOrigin: 'left center'
        },
        {
          scaleX: 1,
          duration: 1.2,
          stagger: 0.15,
          ease: 'power3.out',
          delay: 1.5
        }
      )

      // Features animation with better timing - removed opacity issues
      gsap.set('.feature-card', { opacity: 1, y: 0, scale: 1 })
      gsap.set('.feature-icon', { opacity: 1, scale: 1, rotation: 0 })
      
      // Simple entrance animation without hiding content
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        y: 20,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out'
      })

      // Stats with sophisticated counter
      gsap.from('.stat-card', {
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out'
      })

      // Number counting animation
      gsap.to('.stat-number', {
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        textContent: (i, target) => target.getAttribute('data-value'),
        duration: 2,
        ease: 'power2.out',
        snap: { textContent: 1 },
        stagger: 0.2,
        delay: 0.5
      })

      // CTA animation
      gsap.from('.cta-section', {
        scrollTrigger: {
          trigger: ctaRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power2.out'
      })

      // Navigation entrance
      gsap.from('.nav-brand', {
        x: -50,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.3
      })

      gsap.from('.nav-launch', {
        x: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.5
      })

    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={heroRef}
      className="min-h-screen w-full text-white overflow-hidden relative"
      style={{ backgroundColor: BRAND_COLORS.darker }}
    >
      {/* Enhanced particles */}
      <div ref={particlesRef} className="fixed inset-0 pointer-events-none z-10"></div>

      {/* Sophisticated background */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Primary gradient orb */}
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: `radial-gradient(circle, ${BRAND_COLORS.primary}, transparent 70%)` }}
        ></div>
        
        {/* Secondary gradient orb */}
        <div 
          className="absolute top-1/3 -right-32 w-80 h-80 rounded-full blur-2xl opacity-15"
          style={{ background: `radial-gradient(circle, ${BRAND_COLORS.secondary}, transparent 70%)` }}
        ></div>
        
        {/* Accent orb */}
        <div 
          className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-xl opacity-10"
          style={{ background: `radial-gradient(circle, ${BRAND_COLORS.accent}, transparent 70%)` }}
        ></div>
      </div>

      {/* Professional Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand */}
            <div className="nav-brand flex items-center space-x-3">
              <div className="relative">
                <img
                  src={walcacheLogo}
                  alt="Walcache Logo"
                  className="w-9 h-9 rounded-lg"
                />
              </div>
              <span 
                className="text-xl font-bold"
                style={{ color: BRAND_COLORS.text }}
              >
                Walcache
              </span>
            </div>

            {/* Professional Launch App Button */}
            <div className="nav-launch">
              <Button 
                onClick={handleLaunchApp}
                className="group relative overflow-hidden px-6 py-2.5 font-semibold transition-all duration-300 hover:scale-105"
                style={{ 
                  background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                  boxShadow: `0 4px 15px ${BRAND_COLORS.primary}30`
                }}
              >
                <span className="relative z-10 flex items-center text-white">
                  <Rocket className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                  Launch App
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(45deg, ${BRAND_COLORS.primaryDark}, ${BRAND_COLORS.secondaryDark})` }}
                ></div>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with better visibility */}
      <section className="hero-section relative min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="text-center max-w-5xl mx-auto relative z-20">
          
          {/* Enhanced Logo */}
          <div className="hero-logo-container mb-12 relative">
            <div className="relative inline-block">
              {/* Logo glow effect */}
              <div 
                className="logo-glow absolute inset-0 rounded-2xl blur-xl opacity-60"
                style={{ background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})` }}
              ></div>
              
              {/* Main logo */}
              <img
                src={walcacheLogo}
                alt="Walcache Logo"
                className="hero-logo-image relative w-32 h-32 mx-auto rounded-2xl shadow-2xl"
                style={{ boxShadow: `0 20px 40px ${BRAND_COLORS.primary}40` }}
              />
            </div>
          </div>

          {/* Brand Speed Lines */}
          <div className="relative mb-8">
            <div 
              className="speed-line absolute left-1/2 transform -translate-x-1/2 -translate-y-4 w-20 h-0.5 rounded-full"
              style={{ 
                background: `linear-gradient(90deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                boxShadow: `0 0 10px ${BRAND_COLORS.primary}80`
              }}
            ></div>
            <div 
              className="speed-line absolute left-1/2 transform -translate-x-1/2 -translate-y-2 w-14 h-0.5 rounded-full"
              style={{ 
                background: `linear-gradient(90deg, ${BRAND_COLORS.accent}, ${BRAND_COLORS.primary})`,
                boxShadow: `0 0 8px ${BRAND_COLORS.accent}80`
              }}
            ></div>
            <div 
              className="speed-line absolute left-1/2 transform -translate-x-1/2 w-10 h-0.5 rounded-full"
              style={{ 
                background: `linear-gradient(90deg, ${BRAND_COLORS.secondary}, ${BRAND_COLORS.primaryLight})`,
                boxShadow: `0 0 6px ${BRAND_COLORS.secondary}80`
              }}
            ></div>
          </div>

          {/* Hero Title - Clean Text */}
          <h1 
            className="hero-title text-6xl md:text-7xl font-black mb-6 leading-tight"
            style={{ color: BRAND_COLORS.text }}
          >
            Walcache
          </h1>

          {/* Hero Subtitle - Better Visibility */}
          <p 
            className="hero-subtitle text-xl md:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed font-medium"
            style={{ color: BRAND_COLORS.textMuted }}
          >
            Lightning-fast <span style={{ color: BRAND_COLORS.primary }} className="font-semibold">CDN</span> for{' '}
            <span style={{ color: BRAND_COLORS.secondary }} className="font-semibold">Walrus</span> decentralized storage
          </p>

          {/* Professional CTA Buttons */}
          <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleLaunchApp}
              className="group relative px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105"
              style={{ 
                background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                boxShadow: `0 8px 25px ${BRAND_COLORS.primary}40`
              }}
            >
              <span className="flex items-center text-white">
                <Zap className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                Get Started
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleViewDemo}
              className="group px-8 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105"
              style={{ 
                borderColor: BRAND_COLORS.primary,
                color: BRAND_COLORS.primary,
                backgroundColor: 'transparent'
              }}
            >
              <span className="flex items-center">
                <Waves className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                View Demo
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section - Better Contrast */}
      <section ref={featuresRef} className="py-20 px-6 relative" style={{ backgroundColor: BRAND_COLORS.dark, minHeight: '600px' }}>
        <div className="max-w-6xl mx-auto">
          <h2 
            className="text-4xl md:text-5xl font-bold text-center mb-16"
            style={{ color: BRAND_COLORS.text, fontSize: '3rem' }}
          >
            Why Choose Walcache?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Lightning Fast */}
            <div 
              className="feature-card p-8 rounded-2xl backdrop-blur-sm transition-all duration-500 hover:scale-105"
              style={{ 
                backgroundColor: BRAND_COLORS.darker,
                border: `2px solid ${BRAND_COLORS.primary}`
              }}
            >
              <div 
                className="feature-icon w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 hover:rotate-12"
                style={{ background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.primaryLight})` }}
              >
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Lightning Fast
              </h3>
              <p className="leading-relaxed text-lg" style={{ color: '#E2E8F0' }}>
                Intelligent caching system delivers content at blazing speeds with Redis-powered optimization.
              </p>
            </div>

            {/* Decentralized */}
            <div 
              className="feature-card p-8 rounded-2xl backdrop-blur-sm transition-all duration-500 hover:scale-105"
              style={{ 
                backgroundColor: BRAND_COLORS.darker,
                border: `2px solid ${BRAND_COLORS.accent}`
              }}
            >
              <div 
                className="feature-icon w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 hover:rotate-12"
                style={{ background: `linear-gradient(45deg, ${BRAND_COLORS.accent}, ${BRAND_COLORS.primary})` }}
              >
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Decentralized
              </h3>
              <p className="leading-relaxed text-lg" style={{ color: '#E2E8F0' }}>
                Built on Walrus network for maximum security and censorship resistance.
              </p>
            </div>

            {/* Global Scale */}
            <div 
              className="feature-card p-8 rounded-2xl backdrop-blur-sm transition-all duration-500 hover:scale-105"
              style={{ 
                backgroundColor: BRAND_COLORS.darker,
                border: `2px solid ${BRAND_COLORS.secondary}`
              }}
            >
              <div 
                className="feature-icon w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 hover:rotate-12"
                style={{ background: `linear-gradient(45deg, ${BRAND_COLORS.secondary}, ${BRAND_COLORS.secondaryLight})` }}
              >
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Global Scale
              </h3>
              <p className="leading-relaxed text-lg" style={{ color: '#E2E8F0' }}>
                Multi-chain support with automatic failover and health monitoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Enhanced Visibility */}
      <section ref={statsRef} className="py-20 px-6" style={{ backgroundColor: `${BRAND_COLORS.dark}30` }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12" style={{ color: BRAND_COLORS.text }}>
            Trusted by Developers Worldwide
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="stat-card">
              <div 
                className="stat-number text-5xl font-black mb-2"
                style={{ color: BRAND_COLORS.primary }}
                data-value="99.9"
              >
                0
              </div>
              <div style={{ color: BRAND_COLORS.textMuted }}>Uptime %</div>
            </div>
            <div className="stat-card">
              <div 
                className="stat-number text-5xl font-black mb-2"
                style={{ color: BRAND_COLORS.secondary }}
                data-value="10"
              >
                0
              </div>
              <div style={{ color: BRAND_COLORS.textMuted }}>TB+ Cached</div>
            </div>
            <div className="stat-card">
              <div 
                className="stat-number text-5xl font-black mb-2"
                style={{ color: BRAND_COLORS.accent }}
                data-value="500"
              >
                0
              </div>
              <div style={{ color: BRAND_COLORS.textMuted }}>ms Avg Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="cta-section">
            <h2 
              className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
              style={{ color: BRAND_COLORS.text }}
            >
              Ready to Speed Up Your Content?
            </h2>
            <p 
              className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: BRAND_COLORS.textMuted }}
            >
              Join the next generation of decentralized content delivery with Walcache
            </p>
            <Button
              size="lg"
              onClick={handleLaunchApp}
              className="group px-12 py-5 text-xl font-semibold transition-all duration-300 hover:scale-110"
              style={{ 
                background: `linear-gradient(45deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
                boxShadow: `0 10px 30px ${BRAND_COLORS.primary}40`
              }}
            >
              <span className="flex items-center text-white">
                <Server className="mr-3 h-6 w-6 group-hover:animate-pulse" />
                Start Building Now
                <ChevronRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}