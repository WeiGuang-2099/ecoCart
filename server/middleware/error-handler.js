function createErrorHandler(config) {
  return (err, req, res, _next) => {
    console.error('Error occurred:', {
      message: err.message,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    const statusCode = err.statusCode || err.status || 500;

    const safeMessage = config.nodeEnv === 'production'
      ? 'Internal server error'
      : (err.message || 'Internal server error');

    res.status(statusCode).json({
      error: safeMessage,
      ...(config.nodeEnv === 'development' && {
        stack: err.stack,
        details: err.details
      })
    });
  };
}

module.exports = { createErrorHandler };
