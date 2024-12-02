const MedicionRepository = require('../repositories/MedicionRepository');

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
      const idTipoMedicion = req.params.idTipoMedicion; // Obtenemos el idTipo de la URL
      const mediciones = await MedicionRepository.findMedicionesByTipo(idTipoMedicion);

      if (!mediciones || mediciones.length === 0) {
        return res.status(404).send('No se encontraron mediciones para el tipo especificado.');
      }

      const titulo = `Mediciones  ${idTipoMedicion}`;

      res.render('VersionBeta/medicionPorTipo', { mediciones, titulo, idTipoMedicion });
    } catch (err) {
      console.error('Error al obtener las mediciones:', err);
      res.status(500).json({ message: 'Error al mostrar las mediciones', error: err.message });
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


        // Renderizar la vista que muestra ambas mediciones
        res.render('VersionBeta/aceleracion', {
                    medicionTipo1,
                    valorTemperatura: { nombre: "Sensor 3 - Temperatura", valor: valorTemperatura },
                    valorHumedad: { nombre: "Sensor 4 - Humedad", valor: valorHumedad },});   
       } catch (err) {
        console.error('Error al mostrar ambas mediciones:', err);
        res.status(500).json({ message: 'Error al mostrar ambas mediciones', error: err.message });
    }
}
  
  

}

module.exports = new MedicionController();