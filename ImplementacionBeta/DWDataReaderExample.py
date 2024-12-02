
#----------------------------------------------------------------------------------------------------------------
# DWDataReader example for Python
#----------------------------------------------------------------------------------------------------------------
# Author: Dewesoft
# Notes:
#   - requires DWDataReaderLib.dll 4.0.0.0 or later
#   - tested with Python 3.4
#----------------------------------------------------------------------------------------------------------------

from DWDataReaderHeader import *
from ctypes import *
import _ctypes

lib = cdll.LoadLibrary("D:/PUCP/chamba/DWDataReader/DWDataReaderLib_v4_2_0_31/Win32&64 Python/DWDataReaderLib64.dll")

# init data reader
if lib.DWInit() != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWInit() failed")

# get data reader version
print("DWDataReader version: " + str(lib.DWGetVersion()))

# add additional data reader
if lib.DWAddReader() != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWAddReader() failed")

# get number of open data readers
num = c_int()
if lib.DWGetNumReaders(byref(num)) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWGetNumReaders() failed")
print("Number of data readers: " + str(num.value))

# open data file
# data file must be in the same folder as the python script
str = input('Please enter a data file name (.d7d, .d7z or .dxd):')
file_name = c_char_p(str.encode())
file_info = DWFileInfo(0, 0, 0)
if lib.DWOpenDataFile(file_name, c_void_p(addressof(file_info))) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWOpenDataFile() failed")

measurement_info = DWMeasurementInfo(0, 0, 0, 0)

if lib.DWGetMeasurementInfo(c_void_p(addressof(measurement_info))) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWGetMeasurementInfo() failed")

print("Sample rate: %.2f" % measurement_info.sample_rate)
print("Start measure time: %.2f" % measurement_info.start_measure_time)
print("Start store time: %.2f" % measurement_info.start_store_time)
print("Duration: %.2f" % measurement_info.duration)

# export XML
str = 'SetupFile.xml'
file_name = c_char_p(str.encode())
if lib.DWExportHeader(file_name) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWExportHeader() failed")

# get num channels
num = lib.DWGetChannelListCount()
if num == -1:
    DWRaiseError("DWDataReader: DWGetChannelListCount() failed")
print("Number of channels: %d" % num)

# get channel list
ch_list = (DWChannel * num)()
if lib.DWGetChannelList(byref(ch_list)) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWGetChannelList() failed")

print("\n")

#----------------------------------------------------------------------------------------------------------------
# channel loop
#----------------------------------------------------------------------------------------------------------------
for i in range(0, num):
    # basic channel properties
    print("************************************************")
    print("Channel #%d" % i)
    print("************************************************")
    print("Index: %d" % ch_list[i].index)
    print("Name: %s" % ch_list[i].name.decode())
    print("Unit: %s" % ch_list[i].unit.decode())
    print("Description: %s" % ch_list[i].description.decode())

    # channel factors
    idx = c_int(ch_list[i].index)
    ch_scale = c_double()
    ch_offset = c_double()
    if lib.DWGetChannelFactors(idx, byref(ch_scale), byref(ch_offset)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetChannelFactors() failed")

    print("Scale: %.2f" % ch_scale.value)
    print("Offset: %.2f" % ch_offset.value)

    # channel type
    max_len = c_int(INT_SIZE)
    buff = create_string_buffer(max_len.value)
    p_buff = cast(buff, POINTER(c_void_p))
    if lib.DWGetChannelProps(idx, c_int(DWChannelProps.DW_CH_TYPE.value), p_buff, byref(max_len)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetChannelProps() failed")
    ch_type = cast(p_buff, POINTER(c_int)).contents

    if ch_type.value == DWChannelType.DW_CH_TYPE_SYNC.value:
        print("Channel type: sync")
    elif ch_type.value == DWChannelType.DW_CH_TYPE_ASYNC.value:
        print("Channel type: async")
    elif ch_type.value == DWChannelType.DW_CH_TYPE_SV.value:
        print("Channel type: single value")
    else:
        print("Channel type: unknown")

    # channel data type
    if lib.DWGetChannelProps(idx, c_int(DWChannelProps.DW_DATA_TYPE.value), p_buff, byref(max_len)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetChannelProps() failed")
    data_type = cast(p_buff, POINTER(c_int)).contents
    print("Data type: %s" % DWDataType(data_type.value).name)

    # channel long name length
    channel_long_name_len_buff = create_string_buffer(INT_SIZE)
    if lib.DWGetChannelProps(idx, c_int(DWChannelProps.DW_CH_LONGNAME_LEN.value), channel_long_name_len_buff, byref(max_len)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetChannelProps() failed")
    long_name_len = cast(channel_long_name_len_buff, POINTER(c_int)).contents

    # channel long name
    channel_long_name_buff = create_string_buffer(long_name_len.value)
    if lib.DWGetChannelProps(idx, c_int(DWChannelProps.DW_CH_LONGNAME.value), channel_long_name_buff, byref(long_name_len)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetChannelProps() failed")
    print("Long name : %s" % channel_long_name_buff.value.decode())

    # channel xml length
    channel_xml_len_buff = create_string_buffer(INT_SIZE)
    if lib.DWGetChannelProps(idx, c_int(DWChannelProps.DW_CH_XML_LEN.value), channel_xml_len_buff, byref(max_len)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetChannelProps() failed")
    xml_len = cast(channel_xml_len_buff, POINTER(c_int)).contents

    # channel xml
    channel_xml_buff = create_string_buffer(xml_len.value)
    if lib.DWGetChannelProps(idx, c_int(DWChannelProps.DW_CH_XML.value), channel_xml_buff, byref(xml_len)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetChannelProps() failed")
    print("Xml : %s" % channel_xml_buff.value.decode())

    # number of samples
    dw_ch_index = c_int(ch_list[i].index)
    sample_cnt = c_int()
    sample_cnt = lib.DWGetScaledSamplesCount(dw_ch_index)
    if sample_cnt < 0:
        DWRaiseError("DWDataReader: DWGetScaledSamplesCount() failed")
    print("Num. samples: %d" % sample_cnt)

    # get actual data
    data = create_string_buffer(
        DOUBLE_SIZE * sample_cnt * ch_list[i].array_size)
    time_stamp = create_string_buffer(DOUBLE_SIZE * sample_cnt)
    p_data = cast(data, POINTER(c_double))
    p_time_stamp = cast(time_stamp, POINTER(c_double))
    if lib.DWGetScaledSamples(dw_ch_index, c_int64(0), sample_cnt, p_data, p_time_stamp) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetScaledSamples() failed")

    # diplay data
    print("Data:")
    for j in range(0, sample_cnt):
        for k in range(0, ch_list[i].array_size):
            print("  Time: %.6f   Value=%.2f" %
                  (p_time_stamp[j], p_data[j * ch_list[i].array_size + k]))

    print("\n")

    # reduced data
    sample_cnt_reduced = c_int()
    block_size = c_double()
    if lib.DWGetReducedValuesCount(dw_ch_index, byref(sample_cnt_reduced), byref(block_size)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetReducedValuesCount() failed")

    reduced_data = (DWReducedValue * sample_cnt_reduced.value)()
    if lib.DWGetReducedValues(dw_ch_index, 0, sample_cnt_reduced, byref(reduced_data)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetReducedValues() failed")

    # diplay data
    print("Reduced data:")
    for rv in reduced_data:
        print("  Time: %.6f   Ave=%.4f   Min=%.4f   Max=%.4f   Rms=%.4f" %
              (rv.time_stamp, rv.ave, rv.min, rv.max, rv.rms))

    # binary data
    if DWDataType(data_type.value) == DWDataType.dtBinary:
        print("Binary data:")
        sample_cnt_binary = lib.DWGetBinarySamplesCount(dw_ch_index)
        if sample_cnt_binary < 0:
            DWRaiseError("DWDataReader: DWGetBinarySamplesCount() failed")

        MAX_BIN_LEN = 10000
        MAX_BIN_SAMPLES = 100

        binary_data = create_string_buffer(MAX_BIN_LEN * MAX_BIN_SAMPLES)
        binary_time_stamp = create_string_buffer(DOUBLE_SIZE * MAX_BIN_SAMPLES)
        p_binary_data = cast(binary_data, POINTER(c_char_p))
        p_binary_time_stamp = cast(binary_time_stamp, POINTER(c_double))

        # read sample by sample
        for j in range(sample_cnt_binary):
            read_samples = 1
            data_len = c_long(MAX_BIN_LEN)
            if lib.DWGetBinarySamples(dw_ch_index, c_int64(j), p_binary_data, p_binary_time_stamp, byref(data_len)) != DWStatus.DWSTAT_OK.value:
                DWRaiseError("DWDataReader: DWGetBinarySamples() failed")

            print("Time=%f, Size=%i Hex values=" %
                  (p_binary_time_stamp[0], data_len.value), end='')
            for k in range(data_len.value):
                print("%02X " % ord(binary_data[k]), end='')
            print("\n")

        # read n-samples (size(int)+sample(char))
        for j in range(0, sample_cnt_binary, MAX_BIN_SAMPLES):
            read_samples = c_long(
                sample_cnt_binary - j if sample_cnt_binary - j < MAX_BIN_SAMPLES else MAX_BIN_SAMPLES)
            data_len = c_long(MAX_BIN_LEN * MAX_BIN_SAMPLES)

            if lib.DWGetBinarySamplesEx(dw_ch_index, c_int64(j), read_samples, p_binary_data, p_binary_time_stamp, byref(data_len)) != DWStatus.DWSTAT_OK.value:
                DWRaiseError("DWDataReader: DWGetBinarySamplesEx() failed")

            # BinLen+BinData, BinLen+BinData, BinLen+BinData, BinLen+BinData...
            data_offset = 0
            for k in range(read_samples.value):
                data_len = int.from_bytes(
                    binary_data[data_offset:data_offset + 4], byteorder='little')
                data_offset += 4
                print("Time=%f, Size=%i Hex values=" %
                      (p_binary_time_stamp[k], data_len), end='')
                for l in range(data_len):
                    print("%02X " % ord(binary_data[data_offset + l]), end='')
                data_offset += data_len
                print("\n")

#----------------------------------------------------------------------------------------------------------------
# end channel loop
#----------------------------------------------------------------------------------------------------------------

print("Reduced block data:")
reduced_sample_so_far = c_int(0)
reduced_sample_iter = 10000

ch_ids = (c_int * num)()
for id in ch_list:
    ch_ids[i] = c_int(id.index)

sample_cnt_reduced = c_int()
block_size = c_double()
if lib.DWGetReducedValuesCount(ch_ids[0], byref(sample_cnt_reduced), byref(block_size)) != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWGetReducedValuesCount() failed")

ib_level = 0
reduced_block_data = (DWReducedValue * (reduced_sample_iter * num))()
while reduced_sample_so_far.value < sample_cnt_reduced.value:
    reduced_sample_iter = min(reduced_sample_iter, sample_cnt_reduced.value - reduced_sample_so_far.value)
    if lib.DWGetReducedValuesBlock(byref(ch_ids), num, reduced_sample_so_far, reduced_sample_iter, ib_level, byref(reduced_block_data)) != DWStatus.DWSTAT_OK.value:
        DWRaiseError("DWDataReader: DWGetReducedValuesBlock() failed")
    reduced_sample_so_far.value += reduced_sample_iter

    for rv in reduced_block_data[:reduced_sample_iter]:
        print("  Time: %.6f   Ave=%.4f   Min=%.4f   Max=%.4f   Rms=%.4f" %
                (rv.time_stamp, rv.ave, rv.min, rv.max, rv.rms))

# close data file
if lib.DWCloseDataFile() != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWCloseDataFile() failed")

# deinit
if lib.DWDeInit() != DWStatus.DWSTAT_OK.value:
    DWRaiseError("DWDataReader: DWDeInit() failed")

# close DLL
_ctypes.FreeLibrary(lib._handle)
del lib
