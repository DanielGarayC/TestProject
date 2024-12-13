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
#include <napi.h>
#include <string>

// Función para calcular PSD usando el método de Welch
std::vector<double> computeWelch(const std::vector<double>& data, int fs, int nfft) {
    int windowSize = nfft;
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

// Función para calcular espectrograma basado en FDD
std::vector<std::vector<double>> computeSpectrogramFDD(const std::vector<double>& data, int fs, int nfft, int step) {
    int windowSize = nfft;
    std::vector<std::vector<double>> spectrogram; // Matriz para el espectrograma

    for (size_t start = 0; start + windowSize <= data.size(); start += step) {
        std::vector<double> window(data.begin() + start, data.begin() + start + windowSize);

        // Aplicar ventana de Hanning
        for (size_t i = 0; i < windowSize; ++i) {
            window[i] *= 0.5 * (1 - cos(2 * M_PI * i / (windowSize - 1)));
        }

        // FFT
        fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * (nfft / 2 + 1));
        fftw_plan plan = fftw_plan_dft_r2c_1d(nfft, window.data(), out, FFTW_ESTIMATE);
        fftw_execute(plan);

        // Calcular PSD
        std::vector<double> psd(nfft / 2 + 1, 0.0);
        for (int i = 0; i < nfft / 2 + 1; ++i) {
            psd[i] = (out[i][0] * out[i][0] + out[i][1] * out[i][1]) / (windowSize * fs);
        }

        fftw_destroy_plan(plan);
        fftw_free(out);

        // Agregar la PSD calculada al espectrograma
        spectrogram.push_back(psd);
    }

    return spectrogram;
}

// Función para calcular PSD (expuesta a Node.js)
Napi::Value ComputePSD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    Napi::Array inputData = info[0].As<Napi::Array>();
    std::vector<double> data;
    for (size_t i = 0; i < inputData.Length(); ++i) {
        data.push_back(inputData.Get(i).As<Napi::Number>().DoubleValue());
    }
    int fs = info[1].As<Napi::Number>().Int32Value();
    int nfft = info[2].As<Napi::Number>().Int32Value();

    auto psd = computeWelch(data, fs, nfft);

    Napi::Array psdArray = Napi::Array::New(env, psd.size());
    for (size_t i = 0; i < psd.size(); ++i) {
        psdArray[i] = psd[i];
    }

    return psdArray;
}

// Función para calcular FDD (expuesta a Node.js)
Napi::Value ComputeFDD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    Napi::Array psdArray = info[0].As<Napi::Array>();
    std::vector<double> psd;
    for (size_t i = 0; i < psdArray.Length(); ++i) {
        psd.push_back(psdArray.Get(i).As<Napi::Number>().DoubleValue());
    }
    int fs = info[1].As<Napi::Number>().Int32Value();
    int nfft = info[2].As<Napi::Number>().Int32Value();

    double fdd = computeFDD(psd, fs, nfft);

    return Napi::Number::New(env, fdd);
}

// Función para calcular espectrograma (expuesta a Node.js)
Napi::Value ComputeSpectrogramFDD(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Leer argumentos desde Node.js
    Napi::Array inputData = info[0].As<Napi::Array>();
    std::vector<double> data;
    for (size_t i = 0; i < inputData.Length(); ++i) {
        data.push_back(inputData.Get(i).As<Napi::Number>().DoubleValue());
    }
    int fs = info[1].As<Napi::Number>().Int32Value();
    int nfft = info[2].As<Napi::Number>().Int32Value();
    int step = info[3].As<Napi::Number>().Int32Value();

    // Calcular espectrograma
    auto spectrogram = computeSpectrogramFDD(data, fs, nfft, step);

    // Convertir el espectrograma a `Napi::Array` (matriz 2D)
    Napi::Array spectrogramArray = Napi::Array::New(env, spectrogram.size());
    for (size_t i = 0; i < spectrogram.size(); ++i) {
        Napi::Array rowArray = Napi::Array::New(env, spectrogram[i].size());
        for (size_t j = 0; j < spectrogram[i].size(); ++j) {
            rowArray[j] = Napi::Number::New(env, spectrogram[i][j]);
        }
        spectrogramArray[i] = rowArray;
    }

    return spectrogramArray;
}

// Inicialización del módulo
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("computePSD", Napi::Function::New(env, ComputePSD));
    exports.Set("computeFDD", Napi::Function::New(env, ComputeFDD));
    exports.Set("computeSpectrogramFDD", Napi::Function::New(env, ComputeSpectrogramFDD));
    return exports;
}

NODE_API_MODULE(process_data_final, Init)