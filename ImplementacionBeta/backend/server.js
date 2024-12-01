require('reflect-metadata');
const express = require('express');
const { createConnection } = require('typeorm');
const MedicionController = require('./controllers/MedicionController');
require('dotenv').config();

const app = express();
app.use(express.json());

const path = require('path'); //Módulo path para los estilos

// Configurar el motor de vistas para EJS y la carpeta de vistas
app.set('view engine', 'ejs');
app.set('views', '../frontend');  // Asegúrate de que esta línea apunte a la ubicación de index.ejs


// Configurar archivos estáticos (CSS, JS, imágenes, etc.)
app.use(express.static(path.join(__dirname, '../frontend/VersionBeta/')));


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
//FALTA HOMOGENIZAR TODO EN UN SOLO CONTROLLER owo (en proceso)
// Nueva ruta para mostrar una medición específica
app.get('/temperatura/:id', (req, res) => MedicionController.mostrarTemperaturaPorIdEnVista(req, res));
// Nueva ruta para mostrar una medición específica
app.get('/humedad/:id', (req, res) => MedicionController.mostrarHumedadPorIdEnVista(req, res));
//Vista principal
app.get('/pagPrincipal', (req,res) => {
  res.render('VersionBeta/index', { usuario: 'Jacorvi' });
})
//Monitoreo
app.get('/Monitoreo', (req,res) => {
  res.render('VersionBeta/subindex', { usuario: 'Jacorvi' });
})
//Parámetros ambientales
app.get('/Ambientales', (req,res) => {
  res.render('VersionBeta/subindex2', { usuario: 'Jacorvi' });
})
//Manejo de primera medicion (Aceleración):
app.get('/primeraMedicion/:idTipoMedicion', (req, res) => 
  MedicionController.redirigirPrimeraMedicion(req, res)
);
//Manejo de tercera medicion (Temperatura):
app.get('/terceraMedicion/:idTipoMedicion', (req, res) => 
  MedicionController.redirigirTerceraMedicion(req, res)
);
//Manejo de tercera medicion (Humedad):
app.get('/cuartaMedicion/:idTipoMedicion', (req, res) => 
  MedicionController.redirigirCuartaMedicion(req, res)
);
//Vistas mediciones:
app.get('/tipoMedicion/:idTipoMedicion', (req, res) => 
  MedicionController.obtenerMedicionesPorTipo(req, res)
);

// Inicia el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
