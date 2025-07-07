import { z } from 'zod'

// Load environment variables from .env file
if (typeof Bun !== 'undefined') {
  // Running in Bun, load from .env file
  const envFile = await Bun.file('.env')
    .text()
    .catch(() => '')
  const envLines = envFile
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
  for (const line of envLines) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  }
}

const configSchema = z.object({
  PORT: z.number().default(4500),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  WALRUS_ENDPOINT: z
    .string()
    .url()
    .default('https://publisher.walrus-testnet.walrus.space'),
  WALRUS_AGGREGATOR: z
    .string()
    .url()
    .default('https://aggregator.walrus-testnet.walrus.space'),
  WALRUS_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  CACHE_TTL: z.number().default(3600),
  MAX_CACHE_SIZE: z.number().default(1000),

  API_KEY_SECRET: z.string().min(1).default('dev-secret-key'),
  ALLOWED_ORIGINS: z
    .string()
    .default(
      'http://localhost:4500,http://localhost:5173,http://localhost:5174',
    ),

  ENABLE_ANALYTICS: z.boolean().default(true),
  WEBHOOK_URL: z.string().optional(),

  TUSKY_API_URL: z.string().url().default('https://api.tusky.io'),
  TUSKY_API_KEY: z.string().optional(),
  TUSKY_DEFAULT_VAULT_ID: z.string().optional(),

  IPFS_GATEWAY: z.string().url().default('https://ipfs.io/ipfs/'),
  ENABLE_IPFS_FALLBACK: z.boolean().default(true),
})

function loadConfig() {
  const env = {
    PORT: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    NODE_ENV: process.env.NODE_ENV,

    WALRUS_ENDPOINT: process.env.WALRUS_ENDPOINT,
    WALRUS_AGGREGATOR: process.env.WALRUS_AGGREGATOR,
    WALRUS_NETWORK: process.env.WALRUS_NETWORK,

    REDIS_URL: process.env.REDIS_URL,
    CACHE_TTL: process.env.CACHE_TTL
      ? parseInt(process.env.CACHE_TTL)
      : undefined,
    MAX_CACHE_SIZE: process.env.MAX_CACHE_SIZE
      ? parseInt(process.env.MAX_CACHE_SIZE)
      : undefined,

    API_KEY_SECRET: process.env.API_KEY_SECRET,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
    WEBHOOK_URL: process.env.WEBHOOK_URL,

    TUSKY_API_URL: process.env.TUSKY_API_URL,
    TUSKY_API_KEY: process.env.TUSKY_API_KEY,
    TUSKY_DEFAULT_VAULT_ID: process.env.TUSKY_DEFAULT_VAULT_ID,

    IPFS_GATEWAY: process.env.IPFS_GATEWAY,
    ENABLE_IPFS_FALLBACK: process.env.ENABLE_IPFS_FALLBACK === 'true',
  }

  const result = configSchema.safeParse(env)

  if (!result.success) {
    console.error('❌ Invalid configuration:', result.error.format())
    process.exit(1)
  }

  return result.data
}

export const config = loadConfig()
