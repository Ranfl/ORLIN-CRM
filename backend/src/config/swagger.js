const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const swaggerDocument = YAML.load(
  path.join(__dirname, '../../docs/openapi.yaml')
);

const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'ORLIN CRM API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    withCredentials: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

module.exports = {
  swaggerUi,
  swaggerDocument,
  swaggerUiOptions,
};
