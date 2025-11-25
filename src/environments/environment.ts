export const environment = {
    production: false,
    apiUrl: 'http://10.1.1.64:9090/marineportaltest/api/v1',
    apiTimeout: 30000,
    maxFileSize: 10485760, // 10MB
    allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
    sessionTimeout: 3600000, // 1 hour
    enableLogging: true,
    enableDebug: true,
    supportedCurrencies: ['KES', 'USD', 'EUR', 'GBP'],
    supportedLanguages: ['en', 'sw'],
    defaultLanguage: 'en',
    defaultCurrency: 'KES',
    itemsPerPage: 10,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    cacheExpiration: 300000, // 5 minutes
};

