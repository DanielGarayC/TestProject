require('reflect-metadata');
const express = require('express');
const { createConnection } = require('typeorm');
const MedicionController = require('./controllers/MedicionController');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configurar el motor de vistas para EJS y la carpeta de vistas
app.set('view engine', 'ejs');
app.set('views', '../frontend');  // Asegúrate de que esta línea apunte a la ubicación de index.ejs



// Conexión a la base de datos
createConnection()
  .then(() => {
    console.log('Conectado a la base de datos');
  })
  .catch((err) => {
    console.error('Error al conectar a la base de datos:', err);
  });
//MANEJAR RUTAS
/*ENDPOINT
app.get('/mediciones', (req, res) => MedicionController.getAllMediciones(req, res));*/



// Nueva ruta para mostrar una medición específica
app.get('/mediciones/:id', (req, res) => MedicionController.mostrarMedicionPorIdEnVista(req, res));


// Inicia el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});