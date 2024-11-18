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
    const decimationFactor = 50;

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

  async getDecimatedData() {
    const repository = this.getRepository();
    const mediciones = await repository.find({
      relations: ['data_sensors', 'data_sensors.sensor'],
    });
    var decimationFactor = 50;
    const decimatedData = [];

    mediciones.forEach(medicion => {
      const dataSensors = medicion.data_sensors;

      // Agrupar por sensor
      const groupedBySensor = dataSensors.reduce((acc, data) => {
        const sensorId = data.sensor.idSensor; // ID del sensor
        if (!acc[sensorId]) {
          acc[sensorId] = [];
        }
        acc[sensorId].push(data);
        return acc;
      }, {});

      // Iterar sobre cada grupo de sensores
      Object.values(groupedBySensor).forEach(sensorGroup => {
        let index = 1; // Reiniciar índice para cada sensor
        for (let i = 0; i < sensorGroup.length; i += decimationFactor) {
          const chunk = sensorGroup.slice(i, i + decimationFactor);
          const promedio = chunk.reduce((sum, data) => sum + data.valor, 0) / chunk.length;

          decimatedData.push({
            idData_sensor: chunk[0].idData_sensor, // ID de la primera medición
            valor: promedio, // Promedio
            index: index.toString(), // Índice reiniciado para cada sensor
            idMedicion: medicion.idMedicion, // ID de la medición
            sensor: chunk[0].sensor, // Sensor asociado
          });

          index++;
        }
      });
    });

    return decimatedData;
  }
}

module.exports = new MedicionRepository();
