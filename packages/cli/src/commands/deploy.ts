import path from 'node:path'
import { Command } from 'commander'
import chalk from 'chalk'
import fs from 'fs-extra'
import mime from 'mime-types'
import ora from 'ora'
import {
  createProgressBar,
  formatBytes,
  getConfig,
  getWCDNClient,
  log,
  verbose,
} from '../utils/config.js'

interface DeployFile {
  localPath: string
  relativePath: string
  size: number
  mimeType: string
}

interface DeployResult {
  site: string
  files: number
  totalSize: number
  blobs: Array<{
    path: string
    blobId: string
    cdnUrl: string
    size: number
  }>
  manifest: {
    blobId: string
    cdnUrl: string
  }
  deployedAt: string
}

export const deployCommand = new Command('deploy')
  .description('Deploy a static site or directory to Walrus')
  .argument('[directory]', 'directory to deploy', '.')
  .option('--name <name>', 'site name for the deployment')
  .option('--preview', 'create a preview deployment (unique URL)')
  .option(
    '-c, --concurrency <num>',
    'number of concurrent uploads',
    parseInt,
    5,
  )
  .option('--no-cache', 'skip cache preloading after deploy')
  .option('--json', 'output result as JSON')
  .option('-y, --yes', 'skip confirmation prompts')
  .action(async (directory, options) => {
    try {
      const client = getWCDNClient()
      const deployDir = path.resolve(directory)

      // Verify directory exists
      if (!(await fs.pathExists(deployDir))) {
        log(`Directory not found: ${deployDir}`, 'error')
        process.exit(1)
      }

      const stat = await fs.stat(deployDir)
      if (!stat.isDirectory()) {
        log(`Not a directory: ${deployDir}`, 'error')
        process.exit(1)
      }

      // Detect build output directories
      const resolvedDir = await detectBuildDir(deployDir)

      // Collect all files
      const files = await collectFiles(resolvedDir)

      if (files.length === 0) {
        log('No files found to deploy', 'warning')
        return
      }

      // Detect if this looks like a static site
      const hasIndex = files.some(
        (f) => f.relativePath === 'index.html',
      )
      const siteName =
        options.name || path.basename(deployDir) || 'walcache-site'

      // Show deploy summary
      const totalSize = files.reduce((sum, f) => sum + f.size, 0)
      console.log()
      console.log(chalk.bold('Walcache Deploy'))
      console.log(chalk.gray('─'.repeat(40)))
      console.log(`  Directory:  ${chalk.cyan(resolvedDir)}`)
      console.log(`  Site name:  ${chalk.cyan(siteName)}`)
      console.log(`  Files:      ${files.length}`)
      console.log(`  Total size: ${formatBytes(totalSize)}`)
      console.log(
        `  Has index:  ${hasIndex ? chalk.green('yes') : chalk.yellow('no')}`,
      )
      if (options.preview) {
        console.log(`  Mode:       ${chalk.magenta('preview')}`)
      }
      console.log()

      if (!hasIndex) {
        log(
          'No index.html found. Deploying as file collection (not a site).',
          'warning',
        )
      }

      // Confirm
      if (!options.yes) {
        const inquirer = await import('inquirer')
        const { proceed } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Deploy to Walrus?',
            default: true,
          },
        ])
        if (!proceed) {
          log('Deploy cancelled', 'warning')
          return
        }
      }

      // Upload all files
      const spinner = ora('Uploading files to Walrus...').start()
      const progressBar = createProgressBar(files.length)
      const uploadedBlobs: DeployResult['blobs'] = []
      let uploaded = 0

      const concurrency = options.concurrency || 5

      for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency)

        const results = await Promise.allSettled(
          batch.map(async (file) => {
            const fileBuffer = await fs.readFile(file.localPath)
            const blob = new File(
              [fileBuffer],
              path.basename(file.localPath),
              { type: file.mimeType },
            )

            verbose(`Uploading ${file.relativePath} (${formatBytes(file.size)})`)

            const result = await client.createUpload(blob)

            uploaded++
            progressBar(uploaded)

            return {
              path: file.relativePath,
              blobId: result.blob_id,
              cdnUrl: client.getCDNUrl(result.blob_id),
              size: file.size,
            }
          }),
        )

        for (const result of results) {
          if (result.status === 'fulfilled') {
            uploadedBlobs.push(result.value)
          } else {
            log(`Upload failed: ${result.reason?.message}`, 'warning')
          }
        }
      }

      spinner.succeed(`Uploaded ${uploadedBlobs.length}/${files.length} files`)

      // Create site manifest
      const manifestSpinner = ora('Creating site manifest...').start()

      const manifest = {
        name: siteName,
        version: options.preview
          ? `preview-${Date.now()}`
          : new Date().toISOString().split('T')[0],
        deployedAt: new Date().toISOString(),
        files: uploadedBlobs.map((b) => ({
          path: b.path,
          blobId: b.blobId,
          size: b.size,
        })),
        entrypoint: hasIndex
          ? uploadedBlobs.find((b) => b.path === 'index.html')?.blobId
          : undefined,
      }

      const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2))
      const manifestFile = new File([manifestBuffer], 'walcache-manifest.json', {
        type: 'application/json',
      })

      const manifestResult = await client.createUpload(manifestFile)
      const manifestBlobId = manifestResult.blob_id
      const manifestCdnUrl = client.getCDNUrl(manifestBlobId)

      manifestSpinner.succeed('Site manifest created')

      // Preload cache for all uploaded files
      if (options.cache !== false) {
        const cacheSpinner = ora('Preloading cache...').start()
        try {
          const blobIds = uploadedBlobs.map((b) => b.blobId)
          await client.preloadBlobs(blobIds)
          cacheSpinner.succeed('Cache preloaded')
        } catch (error) {
          cacheSpinner.warn('Cache preload partially failed (files still accessible)')
          verbose(`Cache error: ${error}`)
        }
      }

      // Build result
      const deployResult: DeployResult = {
        site: siteName,
        files: uploadedBlobs.length,
        totalSize,
        blobs: uploadedBlobs,
        manifest: {
          blobId: manifestBlobId,
          cdnUrl: manifestCdnUrl,
        },
        deployedAt: new Date().toISOString(),
      }

      // Save deploy result
      const resultFile = `walcache-deploy-${Date.now()}.json`
      await fs.writeJson(resultFile, deployResult, { spaces: 2 })

      // Output
      if (options.json) {
        console.log(JSON.stringify(deployResult, null, 2))
      } else {
        console.log()
        console.log(chalk.bold.green('Deploy successful!'))
        console.log(chalk.gray('─'.repeat(40)))
        console.log()

        if (hasIndex) {
          const entryBlob = uploadedBlobs.find(
            (b) => b.path === 'index.html',
          )
          if (entryBlob) {
            console.log(
              `  ${chalk.bold('Site URL:')}     ${chalk.cyan(entryBlob.cdnUrl)}`,
            )
          }
        }

        console.log(
          `  ${chalk.bold('Manifest:')}    ${chalk.cyan(manifestCdnUrl)}`,
        )
        console.log(
          `  ${chalk.bold('Files:')}       ${uploadedBlobs.length} uploaded`,
        )
        console.log(
          `  ${chalk.bold('Total size:')}  ${formatBytes(totalSize)}`,
        )
        console.log(`  ${chalk.bold('Results:')}     ${resultFile}`)
        console.log()

        // Show individual file URLs
        if (uploadedBlobs.length <= 20) {
          console.log(chalk.bold('Deployed files:'))
          for (const blob of uploadedBlobs) {
            console.log(
              `  ${chalk.gray(blob.path)} → ${chalk.blue(blob.cdnUrl)}`,
            )
          }
        } else {
          console.log(
            chalk.gray(
              `  ${uploadedBlobs.length} files deployed. See ${resultFile} for full list.`,
            ),
          )
        }
        console.log()
      }
    } catch (error: any) {
      log(`Deploy error: ${error.message}`, 'error')
      verbose(error.stack)
      process.exit(1)
    }
  })

/**
 * Detect common build output directories
 */
async function detectBuildDir(baseDir: string): Promise<string> {
  const buildDirs = ['dist', 'build', 'out', '.next/out', 'public']

  for (const dir of buildDirs) {
    const fullPath = path.join(baseDir, dir)
    if (await fs.pathExists(fullPath)) {
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        // Check if it has an index.html (looks like a build output)
        const indexPath = path.join(fullPath, 'index.html')
        if (await fs.pathExists(indexPath)) {
          log(`Detected build output: ${dir}/`, 'info')
          return fullPath
        }
      }
    }
  }

  return baseDir
}

/**
 * Recursively collect all files in a directory
 */
async function collectFiles(dirPath: string): Promise<Array<DeployFile>> {
  const files: Array<DeployFile> = []

  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)

      // Skip hidden files and common non-deploy directories
      if (entry.name.startsWith('.')) continue
      if (
        entry.isDirectory() &&
        ['node_modules', '.git', '__pycache__'].includes(entry.name)
      ) {
        continue
      }

      if (entry.isFile()) {
        const stat = await fs.stat(fullPath)
        files.push({
          localPath: fullPath,
          relativePath: path.relative(dirPath, fullPath),
          size: stat.size,
          mimeType: mime.lookup(fullPath) || 'application/octet-stream',
        })
      } else if (entry.isDirectory()) {
        await walk(fullPath)
      }
    }
  }

  await walk(dirPath)
  return files
}
