const { getRepository } = require('typeorm');
const {Between } = require('typeorm'); 
const Medicion = require('../entities/Medicion');

class MedicionRepository {
  constructor() {
    this.repository = null;
  }

  getRepository() {
    if (!this.repository) {
      this.repository = getRepository(Medicion);
    }
    return this.repository;
  }

  async findAllMedicionesWithData() {
    const repository = this.getRepository();
    return await repository.find({
      relations: ['data_sensors', 'data_sensors.sensor'],
    });
  }

  async obtenerMedicionPorId(id){
    try {
      const repository = this.getRepository();
      const medicion = await repository.findOne({ where: { idMedicion: id } });
    
      if (!medicion) {
        console.log('Medición no encontrada');
        return null;
      }
      
      return medicion;
    } catch (err) {
      console.error('Error al obtener la medición:', err);
      throw err; // Lanza el error si algo sale mal
    }
  }
  /*async getDecimatedDataById(id) {
    const repository = this.getRepository();
    const decimationFactor = 100; // Factor de decimación fijo

    try {
        // Consulta SQL para obtener la medición con los datos decimados
        const queryMedicion = `
            SELECT 
                idMedicion,
                Fecha_hora,
                idTipoMedicion
            FROM Medicion
            WHERE idMedicion = ?;
        `;

        // Consulta SQL para decimación
        const queryDataSensors = `
            SELECT 
                idSensor,
                FLOOR(ds.\`index\` / ?) AS bloque,
                AVG(valor) AS valorPromedio
            FROM Data_sensor ds
            WHERE ds.idMedicion = ?
            GROUP BY idSensor, bloque
            ORDER BY idSensor, bloque;
        `;

        // Ejecutar la consulta para obtener la medición
        const medicionResult = await repository.manager.query(queryMedicion, [id]);

        if (!medicionResult || medicionResult.length === 0) {
            console.error(`No se encontró una medición con el ID ${id}`);
            return null;
        }

        // Ejecutar la consulta para obtener los datos decimados
        const dataSensorsResult = await repository.manager.query(queryDataSensors, [decimationFactor, id]);

        // Construir el objeto de medición con datos decimados
        const medicion = {
            idMedicion: medicionResult[0].idMedicion,
            Fecha_hora: medicionResult[0].Fecha_hora,
            idTipoMedicion: medicionResult[0].idTipoMedicion,
            data_sensors: dataSensorsResult.map((row) => ({
                idSensor: row.idSensor,
                bloque: row.bloque,
                valorPromedio: row.valorPromedio,
            })),
        };

        return medicion;
    } catch (error) {
        console.error("Error al ejecutar la consulta de decimación:", error);
        throw error;
    }
} */
  async getDecimatedDataById(id) {
    const repository = this.getRepository();
    const medicion = await repository.findOne({
        where: { idMedicion: id },
        relations: ['data_sensors', 'data_sensors.sensor'],
    });

    if (!medicion) {
        console.error(`No se encontró una medición con el ID ${id}`);
        return null;
    }

    const decimatedData = [];
    //---------FACTOR DE DECIMACION---------//
    const decimationFactor = 100;

    // Agrupar y procesar los datos de sensores
    const groupedBySensor = medicion.data_sensors.reduce((acc, data) => {
        const sensorId = data.sensor.idSensor;
        if (!acc[sensorId]) {
            acc[sensorId] = [];
        }
        acc[sensorId].push(data);
        return acc;
    }, {});

    Object.values(groupedBySensor).forEach(sensorGroup => {
        let index = 1;
        for (let i = 0; i < sensorGroup.length; i += decimationFactor) {
            const chunk = sensorGroup.slice(i, i + decimationFactor);
            const promedio = chunk.reduce((sum, data) => sum + data.valor, 0) / chunk.length;

            decimatedData.push({
                idData_sensor: chunk[0].idData_sensor,
                valor: promedio,
                index: index.toString(),
                idMedicion: id,
                sensor: chunk[0].sensor,
            });

            index++;
        }
    });

    medicion.data_sensors = decimatedData;
    return medicion;
  }

  //Sin Decimación
  async getSimpleData(id) {
    const repository = this.getRepository();
    const medicion = await repository.findOne({
        where: { idMedicion: id },
        relations: ['data_sensors', 'data_sensors.sensor'],
    });

    if (!medicion) {
        console.error(`No se encontró una medición con el ID ${id}`);
        return null;
    }
    return medicion;
  }

  async findMedicionesByTipo(idTipo) {
    const repository = this.getRepository();
    return await repository.find({
      where: { tipomedicion: { idTipoMedicion: idTipo } }, // Usamos la relación 'tipomedicion'
      order: {
        fecha_hora: 'DESC', // Ordenar por 'fecha_hora' en orden descendente (más reciente primero)
      },
    });
  }

  async findIdUltimaMedicionPorTipo(idTipo) {
    const repository = this.getRepository();
    const ultimaMedicion = await repository
      .createQueryBuilder('Medicion')
      .leftJoin('Medicion.tipomedicion', 'Tipomedicion') // Relacionamos con 'tipomedicion'
      .where('Tipomedicion.idTipoMedicion = :idTipo', { idTipo }) // Filtramos por idTipoMedicion
      .orderBy('Medicion.fecha_hora', 'DESC') // Ordenamos por fecha_hora descendente
      .select('Medicion.idMedicion') // Solo seleccionamos el idMedicion
      .getOne(); // Obtenemos un solo resultado
  
    return ultimaMedicion ? ultimaMedicion.idMedicion : null; // Retornamos el idMedicion
  }
  
  async findUltimaMedicionPorTipo(idTipoMedicion) {
    // Acceder al repositorio de la entidad "Medicion"
    const repository = this.getRepository();
    // Consulta para obtener la última medición de un tipo específico
    const ultimaMedicion = await repository
      .createQueryBuilder('Medicion')
      .leftJoin('Medicion.tipomedicion', 'Tipomedicion') // Relacionamos con 'tipomedicion'
      .where('Tipomedicion.idTipoMedicion = :idTipoMedicion', { idTipoMedicion })
      .orderBy('Medicion.fecha_hora', 'DESC') // Ordenar por fecha_hora descendente
      .select([
        'Medicion.idMedicion', // Incluimos las columnas de Medicion
        'Medicion.fecha_hora',
        'Tipomedicion.idTipoMedicion', // Incluimos las columnas de Tipomedicion si las necesitas
      ])
      .getOne(); // Obtener solo un resultado
  
    return ultimaMedicion ? ultimaMedicion : null; // Devolver la última medición encontrada
  }
  

  async findMedicionesPorFechaYTipo(idTipoMedicion, fecha) {
    const repository = this.getRepository();
  
    // Configurar inicio y fin del día
    const inicioFecha = new Date(fecha);
    inicioFecha.setHours(0, 0, 0, 0);
    const finFecha = new Date(fecha);
    finFecha.setHours(23, 59, 59, 999);
  
    // Buscar mediciones dentro del rango de la fecha para un tipo específico
    return await repository.find({
      where: {
        tipomedicion: { idTipoMedicion },
        fecha_hora: Between(inicioFecha, finFecha),
      },
      order: {
        fecha_hora: 'DESC', // Ordenar por fecha más reciente primero
      },
    });
  }
  


  
  async findMedicionPorHoraYTipo({ fecha, idTipoMedicion }) {
    const repository = this.getRepository();
  
    // Convertimos la fecha truncada a un rango para buscar entre la hora exacta
    const inicioHora = new Date(fecha);
    const finHora = new Date(fecha);
    finHora.setHours(inicioHora.getHours() + 1); // Final de la hora (1 hora después)
  
    const medicion = await repository
      .createQueryBuilder('Medicion')
      .leftJoin('Medicion.tipomedicion', 'Tipomedicion') // Relacionamos con 'tipomedicion'
      .where('Tipomedicion.idTipoMedicion = :idTipoMedicion', { idTipoMedicion })
      .andWhere('Medicion.fecha_hora >= :inicioHora', { inicioHora })
      .andWhere('Medicion.fecha_hora < :finHora', { finHora })
      .select([
        'Medicion.idMedicion',
        'Medicion.fecha_hora',
        'Medicion.idTipoMedicion'
      ])
      .getOne(); // Obtener solo una medición que cumpla las condiciones
  
    return medicion ? medicion: null;; // Retorna la medición encontrada o null si no hay resultados
  }
  
  async procesarDatos(dataSensors) {
    return dataSensors.reduce((acc, medicion) => {
        const sensorId = medicion.sensor.idSensor;
        if (!acc[sensorId]) {
            acc[sensorId] = [];
        }
        acc[sensorId].push(medicion);
        return acc;
    }, {});
    console.log('Datos agrupados por sensor:', agrupados);
}
  

}

module.exports = new MedicionRepository();
