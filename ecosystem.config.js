const path = require('path');

module.exports = {
  apps: [
    {
      name: 'deals-portal',
      cwd: path.resolve(__dirname, 'apps/deals'),
      script: path.resolve(__dirname, 'node_modules/next/dist/bin/next'),
      args: 'start -p 4001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      // Logging configuration
      error_file: path.resolve(__dirname, 'logs/pm2-deals-error.log'),
      out_file: path.resolve(__dirname, 'logs/pm2-deals-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
