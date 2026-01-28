module.exports = {
  apps: [
    {
      name: 'naver-keyword-backend',
      cwd: './backend',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=naver-keyword-saas --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'naver-keyword-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: 5173
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
