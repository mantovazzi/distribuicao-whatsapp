module.exports = {
  apps: [
    {
      name: "whatsapp-rr",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
