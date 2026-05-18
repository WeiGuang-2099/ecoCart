const { body, query } = require('express-validator');

const barcodeValidation = [
  body('barcode').isString().trim().isLength({ min: 6, max: 18 })
    .withMessage('Barcode must be between 6 and 18 characters'),
  body('detectionMethod').optional().isString().trim()
];

const barcodeQueryValidation = [
  query('barcode').isString().trim().isLength({ min: 6, max: 18 })
    .withMessage('Barcode must be between 6 and 18 characters')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('Barcode must contain only alphanumeric characters')
];

const localAlternativesValidation = [
  body('productCategory').optional().isString().trim(),
  body('userLocation.lat').isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('userLocation.lng').isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

module.exports = { barcodeValidation, barcodeQueryValidation, localAlternativesValidation };
