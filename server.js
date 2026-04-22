const { createApp } = require('./server/app');
const config = require('./config');

try {
  config.validate();
  console.log('Configuration validated successfully');
  console.log('Configuration:', config.getSummary());
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

const app = createApp();
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`EcoCart server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
