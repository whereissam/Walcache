import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Copy,
  ExternalLink,
  Code,
  Download,
  Globe,
  Terminal,
} from 'lucide-react'

export function APIGuide() {
  const [copySuccess, setCopySuccess] = useState<string>('')
  const [exampleCID, setExampleCID] = useState(
    'qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra',
  )

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(label)
      setTimeout(() => setCopySuccess(''), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const curlExample = `curl -X GET "http://localhost:4500/cdn/${exampleCID}" \\
  -H "Accept: */*" \\
  -H "User-Agent: MyApp/1.0" \\
  --output downloaded-file`

  const jsExample = `// Using fetch API
const response = await fetch('http://localhost:4500/cdn/${exampleCID}');
const blob = await response.blob();

// Using axios
import axios from 'axios';
const response = await axios.get('http://localhost:4500/cdn/${exampleCID}', {
  responseType: 'blob'
});`

  const pythonExample = `import requests

# Download content
response = requests.get('http://localhost:4500/cdn/${exampleCID}')
if response.status_code == 200:
    with open('downloaded-file', 'wb') as f:
        f.write(response.content)

# Check cache status
stats = requests.get('http://localhost:4500/api/stats/${exampleCID}').json()
print(f"Cached: {stats['cached']}, Hit Rate: {stats['stats']['hitRate']}")`

  const phpExample = `<?php
$cid = '${exampleCID}';
$url = "http://localhost:4500/cdn/" . $cid;

// Download content
$content = file_get_contents($url);
if ($content !== false) {
    file_put_contents('downloaded-file', $content);
}

// Check cache status
$stats_url = "http://localhost:4500/api/stats/" . $cid;
$stats = json_decode(file_get_contents($stats_url), true);
echo "Cached: " . ($stats['cached'] ? 'Yes' : 'No');
?>`

  const sdkExample = `import { getCDNUrl, preloadCIDs, getCIDInfo, configure } from "@walrus/cdn";

// Configure the SDK with your CDN base URL
configure({ 
  baseUrl: "http://localhost:4500" 
});

// Get CDN URL for a CID
const url = getCDNUrl("${exampleCID}");
console.log(url); // http://localhost:4500/cdn/${exampleCID}

// Preload multiple CIDs for better performance
await preloadCIDs([
  "${exampleCID}",
  "bafybeihabc456...",
  "bafybeihabc789..."
]);

// Get detailed info for a CID
const info = await getCIDInfo("${exampleCID}");
console.log(\`Hit rate: \${info.stats?.hitRate}%\`);`

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">API & SDK Guide</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Learn how to integrate WCDN CDN proxy into your applications
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Test the CDN with any CID. Try the example below or enter your own.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Test CID
              </label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter a CID to test"
                  value={exampleCID}
                  onChange={(e) => setExampleCID(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `http://localhost:4500/cdn/${exampleCID}`,
                      '_blank',
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border">
              <p className="text-sm">
                <strong>CDN URL:</strong>
                <code className="ml-2 px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs">
                  http://localhost:4500/cdn/{exampleCID}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      `http://localhost:4500/cdn/${exampleCID}`,
                      'URL',
                    )
                  }
                  className="ml-2 h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Complete reference for all available endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* CDN Endpoints */}
            <div>
              <h4 className="text-lg font-semibold mb-3 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-blue-500" />
                CDN Endpoints
              </h4>
              <div className="space-y-3">
                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">GET /cdn/:cid</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('/cdn/:cid', 'Endpoint')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Serve cached Walrus content by CID. Returns file content
                    with appropriate headers.
                  </p>
                </div>

                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">
                      GET /api/stats/:cid
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard('/api/stats/:cid', 'Endpoint')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get analytics and cache information for a specific CID.
                  </p>
                </div>

                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">GET /api/metrics</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard('/api/metrics', 'Endpoint')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Global CDN performance metrics and top CIDs.
                  </p>
                </div>
              </div>
            </div>

            {/* Cache Management */}
            <div>
              <h4 className="text-lg font-semibold mb-3 flex items-center">
                <Download className="h-5 w-5 mr-2 text-green-500" />
                Cache Management
              </h4>
              <div className="space-y-3">
                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">POST /api/preload</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard('POST /api/preload', 'Endpoint')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Preload multiple CIDs into cache. Body:{' '}
                    <code>{'{ cids: string[] }'}</code>
                  </p>
                </div>

                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">
                      POST /api/pin/:cid
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard('POST /api/pin/:cid', 'Endpoint')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pin CID to prevent cache eviction.
                  </p>
                </div>

                <div className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">
                      DELETE /api/pin/:cid
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard('DELETE /api/pin/:cid', 'Endpoint')
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Unpin CID from cache.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* cURL Example */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Terminal className="h-5 w-5 mr-2" />
              cURL Example
            </CardTitle>
            <CardDescription>
              Download content using command line
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                <code>{curlExample}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(curlExample, 'cURL')}
                className="absolute top-2 right-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copySuccess === 'cURL' && (
              <p className="text-xs text-green-600 mt-2">
                Copied to clipboard!
              </p>
            )}
          </CardContent>
        </Card>

        {/* JavaScript Example */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="h-5 w-5 mr-2" />
              JavaScript/Node.js
            </CardTitle>
            <CardDescription>
              Fetch content in JavaScript applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="text-xs bg-gray-900 text-blue-400 p-4 rounded overflow-x-auto">
                <code>{jsExample}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(jsExample, 'JavaScript')}
                className="absolute top-2 right-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copySuccess === 'JavaScript' && (
              <p className="text-xs text-green-600 mt-2">
                Copied to clipboard!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Python Example */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Python
            </CardTitle>
            <CardDescription>
              Download content with Python requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="text-xs bg-gray-900 text-yellow-400 p-4 rounded overflow-x-auto">
                <code>{pythonExample}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(pythonExample, 'Python')}
                className="absolute top-2 right-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copySuccess === 'Python' && (
              <p className="text-xs text-green-600 mt-2">
                Copied to clipboard!
              </p>
            )}
          </CardContent>
        </Card>

        {/* PHP Example */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="h-5 w-5 mr-2" />
              PHP
            </CardTitle>
            <CardDescription>Integrate with PHP applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="text-xs bg-gray-900 text-purple-400 p-4 rounded overflow-x-auto">
                <code>{phpExample}</code>
              </pre>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(phpExample, 'PHP')}
                className="absolute top-2 right-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copySuccess === 'PHP' && (
              <p className="text-xs text-green-600 mt-2">
                Copied to clipboard!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SDK Usage */}
      <Card>
        <CardHeader>
          <CardTitle>@walrus/cdn (Coming Soon)</CardTitle>
          <CardDescription>
            Official TypeScript SDK for seamless integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> The SDK is currently in development. You
                can use the REST API endpoints directly for now.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">
                Installation (Future)
              </h4>
              <div className="relative">
                <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">
                  <code>npm install @walrus/cdn</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard('npm install @walrus/cdn', 'Install')
                  }
                  className="absolute top-2 right-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">
                Usage Example (Planned)
              </h4>
              <div className="relative">
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                  <code>{sdkExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(sdkExample, 'SDK')}
                  className="absolute top-2 right-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copySuccess === 'SDK' && (
                <p className="text-xs text-green-600 mt-2">
                  Copied to clipboard!
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
          <CardDescription>Tips for optimal CDN performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-600">🚀 Performance</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  Preload frequently accessed content during off-peak hours
                </li>
                <li>Pin critical content to prevent cache eviction</li>
                <li>
                  Use HEAD requests to check cache status before downloading
                </li>
                <li>Monitor cache hit rates and adjust TTL accordingly</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-green-600">🔄 Reliability</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>IPFS fallback is automatically enabled for redundancy</li>
                <li>
                  Handle HTTP 404 responses gracefully for missing content
                </li>
                <li>Implement retry logic for temporary network issues</li>
                <li>Monitor /api/metrics for service health</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-purple-600">⚡ Integration</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Use the CDN URL directly in your application</li>
                <li>Cache URLs client-side to reduce API calls</li>
                <li>Implement proper error handling for CDN failures</li>
                <li>Consider bandwidth costs when preloading content</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
