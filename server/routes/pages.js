const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/privacy-policy', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../privacy-policy.html'));
});

module.exports = router;
