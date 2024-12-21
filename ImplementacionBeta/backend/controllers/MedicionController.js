const MedicionRepository = require('../repositories/MedicionRepository');
const AnalisisSensoresService = require('../services/AnalisisSensoresService.js');
//MANEJAR VISTAS
class MedicionController {
  /*ENDPOINT
  async getAllMediciones(req, res) {
    try {
      const mediciones = await MedicionRepository.findAllMedicionesWithData();
      res.status(200).json(mediciones);
    } catch (err) {
      res.status(500).json({ message: 'Error al obtener las mediciones', error: err.message });
    }
  }*/

  // Nueva función para mostrar la vista con Highcharts
  async mostrarMedicionPorIdEnVista(req, res) {
    try {
        const { id } = req.params;  // Obtener el 'id' desde los parámetros de la URL
        console.log("id recibido en la ruta: ", id);
        const medicion = await MedicionRepository.obtenerMedicionPorId(id); // Obtener medición por ID

        // Verificar si se encontró la medición
        if (!medicion) {
          console.log('Medición no encontrada');
          return res.status(404).send('Medición no encontrada');
        }

        // Obtener la fecha de la última medición
        const fechaHora = new Date(medicion.fecha_hora);
        const horaTruncada = new Date(fechaHora);  // Crear una copia de la fecha
        horaTruncada.setMinutes(0, 0, 0);  // Truncar a la hora
        const hora = fechaHora.getHours();  // Obtener solo la hora

        // Buscar medición del tipo 2 con la misma hora
        const medicionTipo2 = await MedicionRepository.findMedicionPorHoraYTipo({
          fecha: horaTruncada,
          idTipoMedicion: 2,
        });

        // Verificar si se encontró la medición tipo 2
        if (!medicionTipo2 || !medicionTipo2.idMedicion) {
          return res.status(404).send('No se encontraron mediciones de tipo 2 con la misma hora.');
        }

        // Redirigir a la URL de medición de tipo 2
        return res.redirect(`/mediciones/aceleracion?tipo1=${medicion.idMedicion}&tipo2=${medicionTipo2.idMedicion}&hora=${hora}`);

    } catch (err) {
        console.error("Error al obtener la medición:", err);
        // Aquí usamos req.params.id en lugar de solo id para evitar el error de referencia
        res.status(500).json({ message: `Error al mostrar la medición con ID ${req.params.id}`, error: err.message });
    }
}

 //Para Temperatura (trabajanding...)
 async mostrarTemperaturaPorIdEnVista(req, res){
  try {
    const { id } = req.params;
    const medicion = await MedicionRepository.getSimpleData(id);

    // Verifica que `medicion` no esté vacío
    if (!medicion || !medicion.data_sensors || medicion.data_sensors.length === 0) {
        console.error("Medición no tiene datos o está vacía");
        return res.status(404).send("No se encontraron datos para la medición con ID " + id);
    }

    //Depurar: console.log("Medición enviada al cliente:", JSON.stringify(medicion, null, 2));

    res.render('VersionBeta/parametros', { medicion });
} catch (err) {
    console.error("Error al obtener la medición:", err);
    res.status(500).json({ message: `Error al mostrar la medición con ID ${id}`, error: err.message });
}
 }


//Mediciones por tipo
  async obtenerMedicionesPorTipo(req, res) {
    try {
      const idTipoMedicion = req.params.idTipoMedicion; // Obtenemos el tipo de medición de la URL
      const { fecha } = req.query; // Capturamos la fecha desde los parámetros de consulta (query)
      let mediciones;

      if (fecha) {
        // Si hay un filtro de fecha, buscamos mediciones específicas
        mediciones = await MedicionRepository.findMedicionesPorFechaYTipo(idTipoMedicion, fecha);
      } else {
        // De lo contrario, mostramos todas las mediciones del tipo
        mediciones = await MedicionRepository.findMedicionesByTipo(idTipoMedicion);
      }

      // Comprobar si no hay mediciones
      if (!mediciones || mediciones.length === 0) {
        return res.status(404).send('No se encontraron mediciones para el tipo o la fecha especificados.');
      }

      // Título y renderizado
      const titulo = `Mediciones del tipo ${idTipoMedicion}`;
      res.render('VersionBeta/medicionPorTipo', {
        mediciones,
        titulo,
        idTipoMedicion,
        fechaFiltro: fecha || '', // Pasamos la fecha seleccionada al EJS
      });
    } catch (err) {
      console.error('Error al obtener mediciones:', err);
      res.status(500).json({
        message: 'Error al mostrar las mediciones',
        error: err.message,
      });
    }
  }



  async redirigirPrimeraMedicion(req, res) {
    try {
      const { idTipoMedicion } = req.params; // Obtener el idTipoMedicion desde la URL

      // Llamar al repositorio para obtener el idMedicion de la última medición
      const ultimaMedicion = await MedicionRepository.findUltimaMedicionPorTipo(idTipoMedicion);

      // Verificar si se obtuvo el idMedicion
      if (!ultimaMedicion || !ultimaMedicion.idMedicion) {
        return res.status(404).send('No se encontraron mediciones para el tipo especificado.');
      }

      // Obtener la fecha de la última medición
      const fechaHora = new Date(ultimaMedicion.fecha_hora);
      const horaTruncada = new Date(fechaHora); // Crear una copia de la fecha
      horaTruncada.setMinutes(0, 0, 0); // Truncar a la hora
      const hora = fechaHora.getHours();

      if (idTipoMedicion === '1') {
        // Buscar una medición con idTipoMedicion = 2, misma hora y día
        const medicionTipo2 = await MedicionRepository.findMedicionPorHoraYTipo({
          fecha: horaTruncada,
          idTipoMedicion: 2,
        });

        if (!medicionTipo2 || !medicionTipo2.idMedicion) {
          return res.status(404).send('No se encontraron mediciones de tipo 2 con la misma hora.');
        }

        // Redirigir a la medición de tipo 2
        return res.redirect(`/mediciones/aceleracion?tipo1=${ultimaMedicion.idMedicion}&tipo2=${medicionTipo2.idMedicion}&hora=${hora}`);
      }
      // Redirigir a la URL de la medición con el idMedicion
      res.redirect(`/medicionT/${ultimaMedicion.idMedicion}`);
    } catch (err) {
      console.error('Error al obtener el id de la última medición:', err);
      res.status(500).json({ message: 'Error al obtener el id de la última medición', error: err.message });
    }
  }

  //Para mostrar 2 sensores en aceleración
  async mostrarAmbasMediciones(req, res) {
    try {
        const { tipo1, tipo2, hora } = req.query;

        if (!tipo1 || !tipo2 || !hora) {
          return res.status(400).send('Faltan parámetros tipo1, tipo2 o hora');
        }

        // Obtener la medición del tipo 1 con decimación
        const medicionTipo1 = await MedicionRepository.getDecimatedDataById(tipo1);

        if (!medicionTipo1 || !medicionTipo1.data_sensors || medicionTipo1.data_sensors.length === 0) {
            console.error("Medición tipo 1 no tiene datos o está vacía");
            return res.status(404).send("No se encontraron datos para la medición de tipo 1 con ID " + tipo1);
        }

        const medicionTipo1Graficas = await MedicionRepository.getSimpleData(tipo1);
        const datosPorSensor = await MedicionRepository.procesarDatos(medicionTipo1Graficas.data_sensors);

        const analisisPorSensor = Object.keys(datosPorSensor).map(sensorId => {
          const sensorData = datosPorSensor[sensorId].map(d => d.valor);
          console.log(`Procesando análisis para el sensor ${sensorId}`);
      
          try {
              const psd = AnalisisSensoresService.computePSD(sensorData);
              const fdd = AnalisisSensoresService.computeFDD(sensorData);
              const spectrogram = AnalisisSensoresService.calculateSpectrogram(sensorData);
              //console.log(`FDD calculado para sensor ${sensorId}:`, fdd);
              if (!Array.isArray(spectrogram) || !spectrogram.every(row => Array.isArray(row))) {
                console.error(`Espectrograma no válido para el sensor ${sensorId}`);
                return { sensorId, error: 'Espectrograma no válido' };
              }
              //console.log(`Resultados para sensor ${sensorId}:`, { psd, fdd, spectrogram });

              return {
                sensorId,
                psd,
                fdd,
                spectrogram,
              };
          } catch (error) {
              console.error(`Error en el análisis para el sensor ${sensorId}:`, error);
              return {
                sensorId,
                psd: [],
                fdd: null,
                spectrogram: [],
                error: error.message,
              };
          }
        });
      

        // Obtener la medición del tipo 2 sin decimación
        const medicionTipo2 = await MedicionRepository.getSimpleData(tipo2);

        if (!medicionTipo2 || medicionTipo2.length === 0) {
          console.error("No se encontraron valores para el índice especificado en el tipo 2");
          return res.status(404).send("No se encontraron valores para el índice especificado en el tipo 2");
        }

        const dataSensorTipo2 = medicionTipo2.data_sensors.find(sensorData =>
          sensorData.index === hora && sensorData.sensor.idSensor === 3); // Busca el sensor con id 3 y el index que pasa

        const valorTemperatura = dataSensorTipo2 ? dataSensorTipo2.valor : 'No disponible';

        const dataSensorTipo2Humedad = medicionTipo2.data_sensors.find(sensorData =>
          sensorData.index === hora && sensorData.sensor.idSensor === 4); // Busca el sensor con id 4 (Humedad)

        const valorHumedad = dataSensorTipo2Humedad ? dataSensorTipo2Humedad.valor : 'No disponible';

        // Separar los datos por tipo para el front-end
        const psdData = analisisPorSensor.map(sensor => ({
          sensorId: sensor.sensorId,
          psd: sensor.psd,
        }));

        const fddData = analisisPorSensor.map(sensor => ({
          sensorId: sensor.sensorId,
          fdd: sensor.fdd,
        }));
        //console.log(fddData)
        const spectrogramData = analisisPorSensor.map(sensor => ({
          sensorId: sensor.sensorId,
          spectrogram: sensor.spectrogram,
        }));

        // Renderizar la vista que muestra ambas mediciones
        res.render('VersionBeta/aceleracion', {
                    medicionTipo1,
                    psdData,
                    fddData,
                    spectrogramData,
                    valorTemperatura: { nombre: "Sensor 3 - Temperatura", valor: valorTemperatura },
                    valorHumedad: { nombre: "Sensor 4 - Humedad", valor: valorHumedad }});
       } catch (err) {
        console.error('Error al mostrar ambas mediciones:', err);
        res.status(500).json({ message: 'Error al mostrar ambas mediciones', error: err.message });
    }
}
  
async mostrarGraficasMedicionPorIdEnVista(req, res) {
  try{
    const {id} = req.params;

        if (!id || isNaN(Number(id))) {
          return res.status(400).send('El parámetro "id" es requerido y debe ser un número.');
        }
        const medicionTipo1Graficas = await MedicionRepository.getSimpleData(id);
        const datosPorSensor = await MedicionRepository.procesarDatos(medicionTipo1Graficas.data_sensors);

        const analisisPorSensor = Object.keys(datosPorSensor).map(sensorId => {
          const sensorData = datosPorSensor[sensorId].map(d => d.valor);
          console.log(`Procesando análisis para el sensor ${sensorId}`);
      
          try {
              const psd = AnalisisSensoresService.computePSD(sensorData);
              const fdd = AnalisisSensoresService.computeFDD(sensorData);
              const spectrogram = AnalisisSensoresService.calculateSpectrogram(sensorData);
              //console.log(`FDD calculado para sensor ${sensorId}:`, fdd);
              if (!Array.isArray(spectrogram) || !spectrogram.every(row => Array.isArray(row))) {
                console.error(`Espectrograma no válido para el sensor ${sensorId}`);
                return { sensorId, error: 'Espectrograma no válido' };
              }
              //console.log(`Resultados para sensor ${sensorId}:`, { psd, fdd, spectrogram });

              return {
                sensorId,
                psd,
                fdd,
                spectrogram,
              };
            } catch (error) {
              console.error(`Error en el análisis para el sensor ${sensorId}:`, error);
              return {
                sensorId,
                psd: [],
                fdd: null,
                spectrogram: [],
                error: error.message,
              };
            }
          });
              // Separar los datos por tipo para el front-end
              const psdData = analisisPorSensor.map(sensor => ({
                sensorId: sensor.sensorId,
                psd: sensor.psd,
              }));

              const fddData = analisisPorSensor.map(sensor => ({
                sensorId: sensor.sensorId,
                fdd: sensor.fdd,
              }));
              //console.log(fddData)
              const spectrogramData = analisisPorSensor.map(sensor => ({
                sensorId: sensor.sensorId,
                spectrogram: sensor.spectrogram,
              }));

              res.render('VersionBeta/aceleracionGraficas', {
                id,
                psdData,
                fddData,
                spectrogramData });
  }catch (err){
    console.error('Error al mostrar gráficas:', err);
    res.status(500).json({ message: 'Error al mostrar gráficas', error: err.message });
  }
}

}

module.exports = new MedicionController();