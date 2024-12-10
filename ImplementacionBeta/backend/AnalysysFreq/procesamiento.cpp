#define _USE_MATH_DEFINES
#include <mysql_driver.h>
#include <mysql_connection.h>
#include <prepared_statement.h>
#include <resultset.h>
#include <exception.h>
#include <iostream>
#include <vector>   
#include <cmath>
#include <fstream>
#include <fftw3.h>

// Función para conectar a MySQL y cargar datos
std::vector<double> loadDataFromDatabase(const std::string& host, const std::string& user, const std::string& password, const std::string& database) {
    try {
        sql::mysql::MySQL_Driver* driver = sql::mysql::get_mysql_driver_instance();
        std::unique_ptr<sql::Connection> conn(driver->connect(host, user, password));
        conn->setSchema(database);

        std::unique_ptr<sql::PreparedStatement> pstmt(conn->prepareStatement("SELECT valor FROM data_sensor ORDER BY index ASC"));
        std::unique_ptr<sql::ResultSet> res(pstmt->executeQuery());

        std::vector<double> data;
        while (res->next()) {
            data.push_back(res->getDouble(1)); // Obtener el valor de la columna
        }

        return data;
    } catch (sql::SQLException& e) {
        throw std::runtime_error("Error de MySQL: " + std::string(e.what()));
    }
}

// Función para calcular Welch (PSD)
std::vector<double> computeWelch(const std::vector<double>& data, int fs, int nfft) {
    int windowSize = nfft;
    //overlap representa los puntos que se tomarán tanto en la ventana actual como en la siguiente para 
    //no perder tanta info owo
    int overlap = windowSize / 2;
    int step = windowSize - overlap;
    int numWindows = (data.size() - windowSize) / step + 1;

    std::vector<double> psd(nfft / 2 + 1, 0.0);

    for (int i = 0; i < numWindows; ++i) {
        std::vector<double> window(data.begin() + i * step, data.begin() + i * step + windowSize);

        // Aplicar ventana de Hanning
        for (int j = 0; j < windowSize; ++j) {
            window[j] *= 0.5 * (1 - cos(2 * M_PI * j / (windowSize - 1)));
        }

        // FFT
        fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * (nfft / 2 + 1));
        fftw_plan plan = fftw_plan_dft_r2c_1d(nfft, window.data(), out, FFTW_ESTIMATE);
        fftw_execute(plan);

        // Calcular PSD
        for (int j = 0; j < nfft / 2 + 1; ++j) {
            psd[j] += (out[j][0] * out[j][0] + out[j][1] * out[j][1]) / (windowSize * fs);
        }

        fftw_destroy_plan(plan);
        fftw_free(out);
    }

    for (auto& p : psd) {
        p /= numWindows;
    }

    return psd;
}

// Función para calcular FDD
double computeFDD(const std::vector<double>& psd, int fs, int nfft) {
    int maxIndex = std::distance(psd.begin(), std::max_element(psd.begin(), psd.end()));
    return (maxIndex * fs) / double(nfft);
}

std::vector<double> computeSpectrogramFDD(
    const std::vector<double>& data, int fs, int nfft, int step) {
    
    int windowSize = nfft; // Tamaño de la ventana.
    std::vector<double> fddValues; // Almacena el FDD para cada ventana.

    // Procesar ventanas consecutivas.
    for (size_t start = 0; start + windowSize <= data.size(); start += step) {
        std::vector<double> window(data.begin() + start, data.begin() + start + windowSize);

        // Aplicar ventana de Hanning.
        for (size_t i = 0; i < windowSize; ++i) {
            window[i] *= 0.5 * (1 - cos(2 * M_PI * i / (windowSize - 1)));
        }

        // FFT
        fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * (nfft / 2 + 1));
        fftw_plan plan = fftw_plan_dft_r2c_1d(nfft, window.data(), out, FFTW_ESTIMATE);
        fftw_execute(plan);

        // Calcular FDD directamente desde la FFT.
        std::vector<double> psd(nfft / 2 + 1, 0.0);
        for (int i = 0; i < nfft / 2 + 1; ++i) {
            psd[i] = (out[i][0] * out[i][0] + out[i][1] * out[i][1]) / (windowSize * fs);
        }
        fftw_destroy_plan(plan);
        fftw_free(out);

        // Encontrar la frecuencia dominante.
        int maxIndex = std::distance(psd.begin(), std::max_element(psd.begin(), psd.end()));
        double fdd = (maxIndex * fs) / double(nfft);

        // Guardar FDD.
        fddValues.push_back(fdd);
    }

    return fddValues;
}

int main() {
    try {
        // Conexión a la base de datos
        std::string host = "tcp://127.0.0.1:3306";
        std::string user = "root";
        std::string password = "rootroot";
        std::string database = "monitoreodb";

        // Cargar datos desde la base de datos
        std::vector<double> data = loadDataFromDatabase(host, user, password, database);

        // Parámetros
        int fs = 512; // Frecuencia de muestreo
        int nfft = 256; // Tamaño de la FFT
        int step = nfft / 4;  // Resolución temporal (25% solapamiento)
        //Mayor nfft: Mejor resolución de frecuencia, pero más datos necesarios.
        //Menor nfft: Menor resolución, pero más rápido de calcular.
        //Si fs = 1000 Hz (frecuencia de muestreo) y nfft = 256, cada punto de la FFT representará 1000 / 256 = 3.91 Hz.

        // Calcular Welch (PSD)
        std::vector<double> psd = computeWelch(data, fs, nfft);

        // Calcular FDD
        double fdd = computeFDD(psd, fs, nfft);

        // Calcular el espectrograma basado en FDD
        std::vector<double> fddValues = computeSpectrogramFDD(data, fs, nfft, step);

        // Guardar resultados en JSON
        std::ofstream output("resultados.json");
        output << "{ \"psd\": [";
        for (size_t i = 0; i < psd.size(); ++i) {
            output << psd[i];
            if (i < psd.size() - 1) output << ",";
        }
        output << "], \"fdd\": " << fdd << " ,";
        output << " \"spectrogram_fdd\": [";
         for (size_t i = 0; i < fddValues.size(); ++i) {
            output << fddValues[i];
            if (i < fddValues.size() - 1) output << ",";
        }
        output << "] }";
        output.close();

        std::cout << "Resultados guardados en resultados.json" << std::endl;
    } catch (const std::exception& ex) {
        std::cerr << "Error: " << ex.what() << std::endl;
        return 1;
    }

    return 0;
}