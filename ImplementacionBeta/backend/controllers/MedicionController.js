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
        const { id } = req.params;
        const medicion = await MedicionRepository.getDecimatedDataById(id);

        // Verifica que `medicion` no esté vacío
        if (!medicion || !medicion.data_sensors || medicion.data_sensors.length === 0) {
            console.error("Medición no tiene datos o está vacía");
            return res.status(404).send("No se encontraron datos para la medición con ID " + id);
        }

        //Depurar: console.log("Medición enviada al cliente:", JSON.stringify(medicion, null, 2));

        res.render('VersionBeta/medicion', { medicion });
    } catch (err) {
        console.error("Error al obtener la medición:", err);
        res.status(500).json({ message: `Error al mostrar la medición con ID ${id}`, error: err.message });
    }
 }

  async mostrarMedicionesAceleracion(req, res){

  }

  async mostrarMedicionesTemperatura(req, res){

  }

  async mostrarMedicionesSSI(req, res){

  }

}

module.exports = new MedicionController();