module.exports = {
  apps: [
    {
      name: 'webxr-gaussian-splat',
      script: 'server.js',
      watch: false,
      env: {
        PORT: 3000,
        NODE_ENV: 'production'
      }
    }
  ]
};
