{
  "targets": [
    {
      "target_name": "process_data_final",
      "sources": ["./AnalysysFreq/process_data_final.cpp"],
      "include_dirs": [
        "./AnalysysFreq/include/node/node-addon-api",
        "./AnalysysFreq/include/mysql", 
        "./AnalysysFreq/include/fftw3",
        "./AnalysysFreq/include/cppconn"
      ],
      "libraries": [
       "C:/Users/Daniel/Desktop/Uni/Chamba/RepoBeta/TestProject/ImplementacionBeta/backend/AnalysysFreq/libs/libfftw3-3.lib",
       "C:/Users/Daniel/Desktop/Uni/Chamba/RepoBeta/TestProject/ImplementacionBeta/backend/AnalysysFreq/libs/mysqlcppconn.lib",
       "C:/Users/Daniel/Desktop/Uni/Chamba/RepoBeta/TestProject/ImplementacionBeta/backend/AnalysysFreq/libs/mysqlcppconnx.lib",
       "C:/Users/Daniel/Desktop/Uni/Chamba/RepoBeta/TestProject/ImplementacionBeta/backend/AnalysysFreq/libs/libcrypto.lib",
       "C:/Users/Daniel/Desktop/Uni/Chamba/RepoBeta/TestProject/ImplementacionBeta/backend/AnalysysFreq/libs/libssl.lib"
      ],
      "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "CONFIGURATION_BUILD_DIR": "./build/Release/",
        "MACOSX_DEPLOYMENT_TARGET": "10.7"
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": ["/EHsc", "/std:c++17"]
        },
        "Link": {
          "AdditionalOptions": ["/MACHINE:X64"]
        }
      }
    }
  ]

  
}

