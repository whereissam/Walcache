#!/usr/bin/env bun

// Simple static file server for frontend demo
const server = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url)
    
    // Serve index.html for root path
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file("./index.html"))
    }
    
    // Handle API calls to backend (proxy to avoid CORS)
    if (url.pathname.startsWith("/api/")) {
      // Proxy to your backend running on port 3000
      const backendUrl = `http://localhost:3000${url.pathname}${url.search}`
      return fetch(backendUrl, {
        method: req.method,
        headers: req.headers,
        body: req.body
      })
    }
    
    return new Response("Not Found", { status: 404 })
  },
})

console.log(`🚀 Frontend demo server running at http://localhost:${server.port}`)
console.log('💡 Make sure your backend is running on http://localhost:3000')
console.log('📱 Open http://localhost:3001 in your browser')