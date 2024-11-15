module.exports = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb',
    synchronize: false, // Cambia a false para evitar crear tablas automáticamente
    logging: false,
    entities: ['entities/*.js'],
  };
  