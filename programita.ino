#include <SoftwareSerial.h>
SoftwareSerial SIM900(7, 8);  // Configure serial port for SIM900. For Arduino MEGA use pins 10,11

// Pin configuration
int pines[] = {2, 5, 6, 10, 11, 12};  // Array of pins to read
int estadoAnterior[] = {-1, -1, -1, -1, -1, -1};  // Previous states

// Network configuration
String apn = "airtelwap.es";  // APN of cell provider
String url = "calm-awfully-shrew.ngrok-free.app/api/data";  // URL without https://

const String PHONE_NUMBER = "+34603743593";  // Controller ID
const String LOCATION = "Warehouse1";  // Controller location

// Timeouts and retry configuration
const unsigned long HTTP_TIMEOUT = 60000;     // 60 seconds timeout for HTTP operations
const int MAX_RETRIES = 3;                    // Maximum number of retry attempts
const unsigned long COMMAND_TIMEOUT = 10000;  // 10 seconds timeout for AT commands

// Global variables
String ultimoMensaje = "";
char aux_str[50];
unsigned long ultimoEnvio = 0;
const unsigned long INTERVALO_ENVIO = 90000; // 90 seconds interval

void setup() {
  // Initialize serial communications
  SIM900.begin(19200);  // SIM900 baud rate
  Serial.begin(19200);  // Arduino serial baud rate
  delay(1000);

  // Configure input pins
  for (int i = 0; i < 6; i++) {
    pinMode(pines[i], INPUT_PULLUP);
    estadoAnterior[i] = digitalRead(pines[i]);
  }

  Serial.println(F("Initializing..."));
  power_on();
  iniciar_Pin();
  establecerConexionGPRS(apn);
  
  // Run HTTP test after GPRS connection
  Serial.println(F("Running HTTP connection test..."));
  testHTTPConnection();
}

void loop() {
  bool cambioDetectado = false;
  bool estadosActuales[6];
  
  // Read all sensors and detect changes
  for (int i = 0; i < 6; i++) {
    estadosActuales[i] = digitalRead(pines[i]);
    if (estadosActuales[i] != estadoAnterior[i]) {
      cambioDetectado = true;
      Serial.print(F("Change detected in sensor "));
      Serial.println(i + 1);
    }
  }

  unsigned long tiempoActual = millis();
  bool tiempoExcedido = (tiempoActual - ultimoEnvio) >= INTERVALO_ENVIO;

  // Send data if there are changes or if time interval has passed
  if (cambioDetectado || tiempoExcedido) {
    enviarDatosSensores();
    ultimoEnvio = tiempoActual;
    
    // Update previous states
    for (int i = 0; i < 6; i++) {
      estadoAnterior[i] = estadosActuales[i];
    }

    if (cambioDetectado) {
      Serial.println(F("Sending due to state change"));
    } else {
      Serial.println(F("Sending due to time interval"));
    }
  }

  delay(100);
}

void testHTTPConnection() {
  Serial.println(F("\n--- Testing HTTP Connection ---"));
  int intentos = 0;
  bool testExitoso = false;

  while (!testExitoso && intentos < MAX_RETRIES) {
    intentos++;
    Serial.print(F("Test attempt "));
    Serial.print(intentos);
    Serial.println(F(" of 3"));

    // Verificar estado GPRS
    if (enviarAT("AT+SAPBR=2,1", "OK", 5000) != 1) {
      Serial.println(F("GPRS connection lost, reconnecting..."));
      establecerConexionGPRS(apn);
    }

    // Inicializar HTTP
    if (enviarAT("AT+HTTPINIT", "OK", 10000) != 1) {
      Serial.println(F("Failed to initialize HTTP"));
      delay(1000);
      continue;
    }

    // Configurar parámetros HTTP
    if (enviarAT("AT+HTTPPARA=\"CID\",1", "OK", 5000) != 1) {
      Serial.println(F("Failed to set CID"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    // URL para el endpoint de test
    String testUrl = "AT+HTTPPARA=\"URL\",\"" + url.substring(0, url.lastIndexOf('/')) + "/test\"";
    if (enviarAT(testUrl.c_str(), "OK", 5000) != 1) {
      Serial.println(F("Failed to set URL"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    // Intentar primero un GET
    Serial.println(F("Testing GET request..."));
    if (enviarAT("AT+HTTPACTION=0", "OK", 5000) == 1) {
      waitForHTTPResponse(HTTP_TIMEOUT);
      sendCommand("AT+HTTPREAD");
      delay(2000);
      ShowSerialData();
    }

    delay(5000); // Esperar entre peticiones

    // Luego intentar un POST
    Serial.println(F("Testing POST request..."));
    if (enviarAT("AT+HTTPACTION=1", "OK", 5000) == 1) {
      waitForHTTPResponse(HTTP_TIMEOUT);
      sendCommand("AT+HTTPREAD");
      delay(2000);
      ShowSerialData();
    }

    // Cerrar sesión HTTP
    sendCommand("AT+HTTPTERM");
    delay(1000);
    
    testExitoso = true;
    Serial.println(F("HTTP Test completed"));
  }

  if (!testExitoso) {
    Serial.println(F("HTTP Test failed after all attempts"));
    reiniciar();
  }
  
  Serial.println(F("--- End of HTTP Test ---\n"));
}

void enviarDatosSensores() {
  int intentos = 0;
  bool envioCorrecto = false;

  while (!envioCorrecto && intentos < MAX_RETRIES) {
    intentos++;
    Serial.print(F("Attempt "));
    Serial.print(intentos);
    Serial.println(F(" of 3"));

    // Create simple string data format
    String data = PHONE_NUMBER + "," + LOCATION + ",";
    
    // Add sensor states
    for (int i = 0; i < 6; i++) {
      bool sensorState = !digitalRead(pines[i]);
      data += sensorState ? "1" : "0";
      if (i < 5) data += ",";  // Add comma except for last value
    }

    Serial.println(F("Starting HTTP request..."));
    Serial.println("Data to send: " + data);

    // Verificar estado GPRS
    if (enviarAT("AT+SAPBR=2,1", "OK", 5000) != 1) {
      Serial.println(F("GPRS connection lost, reconnecting..."));
      establecerConexionGPRS(apn);
    }

    // Inicializar HTTP
    if (enviarAT("AT+HTTPINIT", "OK", 10000) != 1) {
      Serial.println(F("Failed to initialize HTTP"));
      delay(1000);
      continue;
    }

    // Configurar parámetros HTTP
    if (enviarAT("AT+HTTPPARA=\"CID\",1", "OK", 5000) != 1) {
      Serial.println(F("Failed to set CID"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    String urlCommand = "AT+HTTPPARA=\"URL\",\"" + url + "\"";
    if (enviarAT(urlCommand.c_str(), "OK", 5000) != 1) {
      Serial.println(F("Failed to set URL"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    // Usar content-type text/plain
    if (enviarAT("AT+HTTPPARA=\"CONTENT\",\"text/plain\"", "OK", 5000) != 1) {
      Serial.println(F("Failed to set content type"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    // Preparar envío de datos
    String dataCommand = "AT+HTTPDATA=" + String(data.length()) + ",30000";
    if (enviarAT(dataCommand.c_str(), "DOWNLOAD", 10000) != 1) {
      Serial.println(F("Failed to start data upload"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    // Enviar datos
    delay(1000);
    SIM900.println(data);
    delay(5000);

    // Verificar buffer
    while(SIM900.available()) {
      Serial.write(SIM900.read());
    }

    // Ejecutar POST
    Serial.println(F("Executing POST request..."));
    if (enviarAT("AT+HTTPACTION=1", "OK", 5000) != 1) {
      Serial.println(F("Failed to execute POST"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    // Esperar respuesta
    waitForHTTPResponse(HTTP_TIMEOUT);
    
    // Leer respuesta
    sendCommand("AT+HTTPREAD");
    delay(2000);
    ShowSerialData();

    // Cerrar sesión HTTP
    sendCommand("AT+HTTPTERM");
    delay(1000);
    
    envioCorrecto = true;
    Serial.println(F("Data sent successfully"));

    // Debug information
    Serial.println(F("Current sensor states:"));
    for (int i = 0; i < 6; i++) {
      Serial.print(F("Sensor "));
      Serial.print(i + 1);
      Serial.print(F(": "));
      Serial.println(!digitalRead(pines[i]) ? F("ON") : F("OFF"));
    }
  }

  if (!envioCorrecto) {
    Serial.println(F("Failed to send data after all attempts"));
    reiniciar();
  }
}

void waitForHTTPResponse(unsigned long timeout) {
  unsigned long startTime = millis();
  boolean responseReceived = false;
  String response = "";
  
  while ((millis() - startTime) < timeout && !responseReceived) {
    if (SIM900.available()) {
      char c = SIM900.read();
      response += c;
      Serial.write(c);
      
      if (response.indexOf("+HTTPACTION: 1,200") != -1) {
        responseReceived = true;
        Serial.println(F("\nSuccessful response received"));
      }
      else if (response.indexOf("+HTTPACTION: 1,") != -1) {
        responseReceived = true;
        Serial.println(F("\nResponse received with non-200 code"));
      }
    }
    delay(100);
  }
  
  if (!responseReceived) {
    Serial.println(F("\nTimeout waiting for HTTP response"));
  }
}

int enviarAT(String ATcommand, char* resp_correcta, unsigned int tiempo) {
  int x = 0;
  bool correcto = 0;
  char respuesta[100];
  unsigned long anterior;

  memset(respuesta, '\0', 100);
  delay(100);
  
  Serial.println(ATcommand);
  while (SIM900.available() > 0) SIM900.read();
  
  SIM900.println(ATcommand);
  x = 0;
  anterior = millis();

  do {
    if (SIM900.available() != 0) {
      respuesta[x] = SIM900.read();
      x++;
      if (strstr(respuesta, resp_correcta) != NULL) {
        correcto = 1;
      }
    }
  } while ((correcto == 0) && ((millis() - anterior) < tiempo));

  Serial.println(respuesta);
  return correcto;
}

void power_on() {
  int respuesta = 0;

  if (enviarAT("AT", "OK", 2000) == 0) {
    Serial.println(F("Turning on SIM900..."));
    pinMode(9, OUTPUT);
    digitalWrite(9, HIGH);
    delay(1000);
    digitalWrite(9, LOW);
    delay(1000);

    while (respuesta == 0) {
      respuesta = enviarAT("AT", "OK", 2000);
    }
    Serial.println(F("SIM900 power on completed."));
  }
}

void power_off() {
  digitalWrite(9, HIGH);
  delay(1000);
  digitalWrite(9, LOW);
  delay(1000);
}

void reiniciar() {
  Serial.println(F("Restarting SIM900..."));
  power_off();
  delay(5000);
  power_on();
}

void iniciar_Pin() {
  Serial.println(F("Entering PIN..."));
  enviarAT("AT+CPIN=\"5555\"", "OK", 10000);
  Serial.println(F("Connecting to network..."));
  delay(5000);

  while (enviarAT("AT+CREG?", "+CREG: 0,1", 10000) == 0) {
    delay(5000);
  }
  Serial.println(F("Connected to network."));
}

void establecerConexionGPRS(String apn) {
  Serial.println(F("Setting up GPRS connection..."));
  enviarAT("AT+SAPBR=0,1", "OK", 20000);
  delay(1000);
  enviarAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", "OK", 20000);
  
  String cmd = "AT+SAPBR=3,1,\"APN\",\"" + apn + "\"";
  enviarAT(cmd, "OK", 20000);
  
  int intentos = 0;
  bool conexionExitosa = false;
  
  while (!conexionExitosa && intentos < MAX_RETRIES) {
    if (enviarAT("AT+SAPBR=1,1", "OK", 30000) == 1) {
      conexionExitosa = true;
      Serial.println(F("GPRS Connection successful"));
    } else {
      intentos++;
      Serial.print(F("GPRS Connection failed, attempt "));
      Serial.print(intentos);
      Serial.println(F(" of 3"));
      delay(5000);
    }
  }
  
  if (!conexionExitosa) {
    Serial.println(F("Failed to establish GPRS connection. Restarting..."));
    reiniciar();
    return;
  }
  
  delay(5000);
}

void ShowSerialData() {
  unsigned long startTime = millis();
  String response = "";
  
  while (millis() - startTime < 5000) {
    if (SIM900.available()) {
      char c = SIM900.read();
      response += c;
      Serial.write(c);
      startTime = millis(); // Reset timeout if new data
    }
    delay(10);
  }
  
  if (response.indexOf("ERROR") != -1) {
    Serial.println(F("\n!!! Error detected in response !!!"));
    Serial.println("Full response: " + response);
  }
}

void sendCommand(const char* command) {
  Serial.println("Sending command: " + String(command));
  SIM900.println(command);
  delay(500);
  ShowSerialData();
}