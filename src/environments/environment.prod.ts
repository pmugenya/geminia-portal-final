export const environment = {
    production: true,
    apiUrl: 'http://192.168.165.79:8080/fineract-provider/api/v1',
    apiTimeout: 30000,
    maxFileSize: 10485760, // 10MB
    allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
    sessionTimeout: 3600000, // 1 hour
    enableLogging: false,
    enableDebug: false,
    supportedCurrencies: ['KES', 'USD', 'EUR', 'GBP'],
    supportedLanguages: ['en', 'sw'],
    defaultLanguage: 'en',
    defaultCurrency: 'KES',
    itemsPerPage: 10,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    cacheExpiration: 300000, // 5 minutes
};
