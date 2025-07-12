import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import mime from 'mime-types';
import inquirer from 'inquirer';
import ora from 'ora';
import { getWCDNClient, getConfig, log, verbose, formatBytes, createProgressBar } from '../utils/config.js';

export const uploadCommand = new Command('upload')
  .description('Upload files to WCDN')
  .argument('[files...]', 'files to upload')
  .option('-r, --recursive', 'upload directories recursively')
  .option('-g, --glob <pattern>', 'upload files matching glob pattern')
  .option('-v, --vault-id <id>', 'vault ID for organization')
  .option('-c, --chain <chain>', 'register on blockchain (ethereum, sui, solana)')
  .option('--no-register', 'skip blockchain registration')
  .option('--concurrency <num>', 'number of concurrent uploads', parseInt, 3)
  .option('--batch-size <num>', 'batch size for blockchain registration', parseInt, 10)
  .option('-y, --yes', 'skip confirmation prompts')
  .action(async (files, options) => {
    try {
      const config = getConfig();
      const client = getWCDNClient();
      
      // Resolve files to upload
      const filesToUpload = await resolveFiles(files, options);
      
      if (filesToUpload.length === 0) {
        log('No files found to upload', 'warning');
        return;
      }

      // Show upload summary
      const totalSize = filesToUpload.reduce((sum, file) => sum + file.size, 0);
      console.log(chalk.bold('\nUpload Summary:'));
      console.log(`Files: ${filesToUpload.length}`);
      console.log(`Total size: ${formatBytes(totalSize)}`);
      
      if (options.chain && options.register !== false) {
        console.log(`Blockchain: ${options.chain || config.defaults?.chain || 'ethereum'}`);
      }

      // Confirm upload
      if (!options.yes) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with upload?',
            default: true,
          },
        ]);

        if (!proceed) {
          log('Upload cancelled', 'warning');
          return;
        }
      }

      // Upload files
      const spinner = ora('Uploading files...').start();
      const progressBar = createProgressBar(filesToUpload.length);
      
      try {
        const uploads = [];
        const concurrency = options.concurrency || 3;
        
        // Upload in batches
        for (let i = 0; i < filesToUpload.length; i += concurrency) {
          const batch = filesToUpload.slice(i, i + concurrency);
          const batchPromises = batch.map(async (fileInfo) => {
            verbose(`Uploading ${fileInfo.path}`);
            
            const fileBuffer = await fs.readFile(fileInfo.path);
            const file = new File([fileBuffer], path.basename(fileInfo.path), {
              type: fileInfo.mimeType,
            });
            
            const result = await client.createUpload(file, {
              vault_id: options.vaultId,
            });
            
            progressBar(uploads.length + 1);
            
            return {
              ...result,
              localPath: fileInfo.path,
              cdnUrl: client.getCDNUrl(result.blob_id),
            };
          });

          const batchResults = await Promise.all(batchPromises);
          uploads.push(...batchResults);
        }

        spinner.succeed(`Uploaded ${uploads.length} files`);

        // Register on blockchain if requested
        if ((options.chain || config.defaults?.registerOnChain) && options.register !== false) {
          const chain = options.chain || config.defaults?.chain || 'ethereum';
          
          if (!client.isBlockchainIntegrationAvailable()) {
            log('Blockchain integration not configured, skipping registration', 'warning');
          } else if (!client.getSupportedChains().includes(chain)) {
            log(`Chain "${chain}" not configured, skipping registration`, 'warning');
          } else {
            const blockchainSpinner = ora(`Registering on ${chain} blockchain...`).start();
            
            try {
              const batchSize = options.batchSize || 10;
              const blobsToRegister = uploads.map(upload => ({
                blobId: upload.blob_id,
                size: upload.size,
                contentType: upload.content_type,
                cdnUrl: upload.cdnUrl,
                contentHash: upload.blob_id, // In practice, compute actual hash
              }));

              // Register in batches
              const txHashes = [];
              for (let i = 0; i < blobsToRegister.length; i += batchSize) {
                const batch = blobsToRegister.slice(i, i + batchSize);
                
                if (batch.length > 1) {
                  const txHash = await client.registerBlobBatchOnChain(batch, chain);
                  txHashes.push(txHash);
                  verbose(`Batch registered: ${txHash}`);
                } else {
                  const txHashRecord = await client.registerBlobOnChain(
                    batch[0].blobId,
                    batch[0],
                    chain
                  );
                  const txHash = txHashRecord[chain];
                  if (txHash) {
                    txHashes.push(txHash);
                    verbose(`Single blob registered: ${txHash}`);
                  }
                }
              }

              blockchainSpinner.succeed(`Registered ${blobsToRegister.length} blobs on ${chain} (${txHashes.length} transactions)`);
              
              // Add transaction hashes to results
              uploads.forEach(upload => {
                upload.blockchainTxs = txHashes;
              });
            } catch (error) {
              blockchainSpinner.fail(`Blockchain registration failed: ${error.message}`);
              verbose(error.stack);
            }
          }
        }

        // Display results
        console.log(chalk.bold('\nUpload Results:'));
        uploads.forEach((upload, index) => {
          console.log(`\n${index + 1}. ${path.basename(upload.localPath)}`);
          console.log(`   Blob ID: ${chalk.cyan(upload.blob_id)}`);
          console.log(`   CDN URL: ${chalk.blue(upload.cdnUrl)}`);
          console.log(`   Size: ${formatBytes(upload.size)}`);
          console.log(`   Status: ${upload.status === 'completed' ? chalk.green('✓ Completed') : chalk.yellow('⏳ Processing')}`);
          
          if (upload.blockchainTxs?.length > 0) {
            console.log(`   Blockchain: ${chalk.green('✓ Registered')} (${upload.blockchainTxs.length} tx)`);
          }
        });

        // Save results to file
        const resultsFile = `wcdn-upload-${Date.now()}.json`;
        await fs.writeJson(resultsFile, uploads, { spaces: 2 });
        log(`Results saved to ${resultsFile}`, 'success');

      } catch (error) {
        spinner.fail('Upload failed');
        throw error;
      }

    } catch (error) {
      log(`Upload error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
}

async function resolveFiles(files: string[], options: any): Promise<FileInfo[]> {
  const resolved: FileInfo[] = [];
  
  if (files.length === 0) {
    // Interactive file selection
    const { fileInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'fileInput',
        message: 'Enter file paths (space-separated) or glob pattern:',
        validate: (input) => input.trim().length > 0 || 'Please enter at least one file path',
      },
    ]);
    
    files = fileInput.trim().split(/\s+/);
  }

  for (const filePath of files) {
    const fullPath = path.resolve(filePath);
    
    try {
      const stat = await fs.stat(fullPath);
      
      if (stat.isFile()) {
        resolved.push({
          path: fullPath,
          size: stat.size,
          mimeType: mime.lookup(fullPath) || 'application/octet-stream',
        });
      } else if (stat.isDirectory() && options.recursive) {
        const dirFiles = await walkDirectory(fullPath);
        resolved.push(...dirFiles);
      } else if (stat.isDirectory()) {
        log(`Skipping directory ${filePath} (use --recursive to include)`, 'warning');
      }
    } catch (error) {
      log(`File not found: ${filePath}`, 'warning');
    }
  }

  return resolved;
}

async function walkDirectory(dirPath: string): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  
  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        files.push({
          path: fullPath,
          size: stat.size,
          mimeType: mime.lookup(fullPath) || 'application/octet-stream',
        });
      } else if (entry.isDirectory()) {
        await walk(fullPath);
      }
    }
  }

  await walk(dirPath);
  return files;
}