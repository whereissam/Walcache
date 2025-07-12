import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getConfig, saveConfig, log } from '../utils/config.js';

export const configCommand = new Command('config')
  .description('Manage WCDN configuration');

configCommand
  .command('show')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = getConfig();
      console.log(chalk.bold('Current Configuration:\n'));
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      log(`Config error: ${error.message}`, 'error');
    }
  });

configCommand
  .command('set')
  .description('Set configuration value')
  .argument('<key>', 'configuration key')
  .argument('<value>', 'configuration value')
  .action(async (key, value) => {
    try {
      const config = getConfig();
      const keys = key.split('.');
      let obj = config;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      
      obj[keys[keys.length - 1]] = value;
      await saveConfig(config);
      log(`Set ${key} = ${value}`, 'success');
    } catch (error) {
      log(`Config error: ${error.message}`, 'error');
    }
  });