const { getRepository } = require('typeorm');
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
  async findMedicionesByTipo(idTipo) {
    const repository = this.getRepository();
    return await repository.find({
      where: { tipomedicion: { idTipoMedicion: idTipo } }, // Usamos la relación 'tipomedicion'
    });
  }
  
  

}

module.exports = new MedicionRepository();
