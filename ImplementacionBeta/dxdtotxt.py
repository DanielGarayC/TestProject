from DWDataReaderHeader import *
from ctypes import *
import _ctypes
import sys

# Cargar la biblioteca DWDataReaderLib.dll
lib = cdll.LoadLibrary('D:/PUCP/chamba/testFolder/DWDataReaderLib64.dll')

# Inicializar el lector de datos
if lib.DWInit() != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWInit() failed")

# Ruta del archivo .dxd
input_file = sys.argv[1]  # Ruta del archivo .dxd
columnas_deseadas = list(map(int, sys.argv[2].split(',')))  # Índices de columnas separados por comas
output_file = sys.argv[3]  # Ruta del archivo .txt a generar

# Abrir el archivo .dxd
file_name = c_char_p(input_file.encode())
file_info = DWFileInfo(0, 0, 0)
if lib.DWOpenDataFile(file_name, c_void_p(addressof(file_info))) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWOpenDataFile() failed")

# Obtener información de medición
measurement_info = DWMeasurementInfo(0, 0, 0, 0)
if lib.DWGetMeasurementInfo(c_void_p(addressof(measurement_info))) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWGetMeasurementInfo() failed")

# Obtener la lista de canales
num_channels = lib.DWGetChannelListCount()

if num_channels == -1:
    DWRaiseError("DWDataReader: DWGetChannelListCount() failed")

channels = (DWChannel * num_channels)()
if lib.DWGetChannelList(byref(channels)) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWGetChannelList() failed")
###

# Imprimir la cantidad de canales
print(f"Número total de canales: {num_channels}")

##################################################
##Nos quedamos con los canales indicados por el script de escucha
canales_seleccionados = [channels[i] for i in columnas_deseadas]

####################################
#Imprimir nombres de los canales
print("Nombres de los canales seleccionados:")
for i in columnas_deseadas:
    channel = canales_seleccionados[i]
    channel_name = channel.name.decode()
    print(f"Canal {i+1}: {channel_name}")
####################################

# Abrir el archivo de salida
with open(output_file, 'w') as out_file:


    # Procesar datos de cada canal
    max_samples = 0
    for i in range(num_channels):
        channel = channels[i]
        dw_ch_index = c_int(channel.index)
        
        # Obtener número de muestras
        sample_count = lib.DWGetScaledSamplesCount(dw_ch_index)
        if sample_count < 0:
            DWRaiseError("DWDataReader: DWGetScaledSamplesCount() failed")
        
        # Determinar el máximo número de muestras entre los canales
        max_samples = max(max_samples, sample_count)
        
    # Leer los datos y escribir en el archivo de salida
    for sample_index in range(max_samples):
        row = []
        
        for i in columnas_deseadas:
            channel = canales_seleccionados[i]
            dw_ch_index = c_int(channel.index)
            
            # Obtener datos y timestamps
            sample_count = lib.DWGetScaledSamplesCount(dw_ch_index)
            data = create_string_buffer(DOUBLE_SIZE * sample_count)
            timestamps = create_string_buffer(DOUBLE_SIZE * sample_count)
            p_data = cast(data, POINTER(c_double))
            p_timestamps = cast(timestamps, POINTER(c_double))
            
            if lib.DWGetScaledSamples(dw_ch_index, c_int64(0), sample_count, p_data, p_timestamps) != DWStatus.DWSTAT_OK.value:
                DWRaiseError("DWDataReader: DWGetScaledSamples() failed")
            
            # Obtener el valor de la muestra correspondiente a sample_index (si está dentro del rango)
            if sample_index < sample_count:
                row.append(f"{p_data[sample_index]:.12E}")
            else:
                row.append("0.000000000000")
        
        # Escribir la fila en el archivo de salida, separada por espacios para seguir el formato de los otros txt generados
        out_file.write(' '.join(row) + '\n')

# Cerrar el archivo .dxd
if lib.DWCloseDataFile() != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWCloseDataFile() failed")

# Finalizar el lector de datos
if lib.DWDeInit() != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWDeInit() failed")

# Liberar la biblioteca DLL
_ctypes.FreeLibrary(lib._handle)
del lib

print(f"Datos exportados exitosamente a {output_file}")
