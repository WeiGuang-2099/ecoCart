const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

function applySecurityMiddleware(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "cdn.jsdelivr.net", "unpkg.com"],
        styleSrc: ["'self'", "cdn.jsdelivr.net", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"]
      }
    }
  }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
  });

  app.use('/api/', apiLimiter);

  // Privacy compliance headers
  app.use((req, res, next) => {
    res.setHeader('X-Privacy-Compliance', 'AU-Privacy-Act-1988');
    res.setHeader('X-Data-Retention', '0-days');
    next();
  });
}

module.exports = { applySecurityMiddleware };
