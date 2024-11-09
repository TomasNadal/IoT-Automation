#include <HardwareSerial.h>

// Configurar puerto serie para SIM900 usando UART2
HardwareSerial &SIM900 = Serial; // Usar UART0
SIM900.begin(19200); // UART2: RX2=GPIO16, TX2=GPIO17

// Configuración de pines
const int pines[] = {13, 12, 14, 27, 26, 25};  // Ejemplo de pines ESP32
int estadoAnterior[] = {-1, -1, -1, -1, -1, -1};

// Configuración de red
const String apn = "airtelwap.es";
const String url = "calm-awfully-shrew.ngrok-free.app/api/data";

const String PHONE_NUMBER = "+34603743593";
const String LOCATION = "Warehouse1";

// Timeouts y reintentos
const unsigned long HTTP_TIMEOUT = 60000;
const int MAX_RETRIES = 3;
const unsigned long COMMAND_TIMEOUT = 10000;

// Variables globales
String ultimoMensaje = "";
char aux_str[50];
unsigned long ultimoEnvio = 0;
const unsigned long INTERVALO_ENVIO = 90000;

void setup() {
  // Ya no necesitamos inicializar Serial por separado ya que SIM900 usa el mismo UART0
  SIM900.begin(19200);  // UART0: RX=GPIO3, TX=GPIO1
  delay(1000);

  // Configurar pines de entrada
  for (int i = 0; i < 6; i++) {
    pinMode(pines[i], INPUT_PULLUP);
    estadoAnterior[i] = digitalRead(pines[i]);
  }

  Serial.println(F("Inicializando..."));
  power_on();
  iniciar_Pin();
  establecerConexionGPRS(apn);
  
  Serial.println(F("Ejecutando prueba de conexión HTTP..."));
  testHTTPConnection();
}

void loop() {
  bool cambioDetectado = false;
  bool estadosActuales[6];
  
  // Leer todos los sensores y detectar cambios
  for (int i = 0; i < 6; i++) {
    estadosActuales[i] = digitalRead(pines[i]);
    if (estadosActuales[i] != estadoAnterior[i]) {
      cambioDetectado = true;
      Serial.print(F("Cambio detectado en sensor "));
      Serial.println(i + 1);
    }
  }

  unsigned long tiempoActual = millis();
  bool tiempoExcedido = (tiempoActual - ultimoEnvio) >= INTERVALO_ENVIO;

  if (cambioDetectado || tiempoExcedido) {
    enviarDatosSensores();
    ultimoEnvio = tiempoActual;
    
    for (int i = 0; i < 6; i++) {
      estadoAnterior[i] = estadosActuales[i];
    }

    if (cambioDetectado) {
      Serial.println(F("Enviando por cambio de estado"));
    } else {
      Serial.println(F("Enviando por intervalo de tiempo"));
    }
  }

  delay(100);
}

void testHTTPConnection() {
  Serial.println(F("\n--- Prueba de Conexión HTTP ---"));
  int intentos = 0;
  bool testExitoso = false;

  while (!testExitoso && intentos < MAX_RETRIES) {
    intentos++;
    Serial.print(F("Intento "));
    Serial.print(intentos);
    Serial.println(F(" de 3"));

    if (enviarAT("AT+SAPBR=2,1", "OK", 5000) != 1) {
      Serial.println(F("Conexión GPRS perdida, reconectando..."));
      establecerConexionGPRS(apn);
    }

    if (enviarAT("AT+HTTPINIT", "OK", 10000) != 1) {
      Serial.println(F("Fallo al inicializar HTTP"));
      delay(1000);
      continue;
    }

    if (enviarAT("AT+HTTPPARA=\"CID\",1", "OK", 5000) != 1) {
      Serial.println(F("Fallo al configurar CID"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    String testUrl = "AT+HTTPPARA=\"URL\",\"" + url.substring(0, url.lastIndexOf('/')) + "/test\"";
    if (enviarAT(testUrl.c_str(), "OK", 5000) != 1) {
      Serial.println(F("Fallo al configurar URL"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    Serial.println(F("Probando petición GET..."));
    if (enviarAT("AT+HTTPACTION=0", "OK", 5000) == 1) {
      waitForHTTPResponse(HTTP_TIMEOUT);
      sendCommand("AT+HTTPREAD");
      delay(2000);
      ShowSerialData();
    }

    delay(5000);

    Serial.println(F("Probando petición POST..."));
    if (enviarAT("AT+HTTPACTION=1", "OK", 5000) == 1) {
      waitForHTTPResponse(HTTP_TIMEOUT);
      sendCommand("AT+HTTPREAD");
      delay(2000);
      ShowSerialData();
    }

    sendCommand("AT+HTTPTERM");
    delay(1000);
    
    testExitoso = true;
    Serial.println(F("Prueba HTTP completada"));
  }

  if (!testExitoso) {
    Serial.println(F("Prueba HTTP falló después de todos los intentos"));
    reiniciar();
  }
  
  Serial.println(F("--- Fin de Prueba HTTP ---\n"));
}

void enviarDatosSensores() {
  int intentos = 0;
  bool envioCorrecto = false;

  while (!envioCorrecto && intentos < MAX_RETRIES) {
    intentos++;
    Serial.print(F("Intento "));
    Serial.print(intentos);
    Serial.println(F(" de 3"));

    String data = PHONE_NUMBER + "," + LOCATION + ",";
    
    for (int i = 0; i < 6; i++) {
      bool sensorState = !digitalRead(pines[i]);
      data += sensorState ? "1" : "0";
      if (i < 5) data += ",";
    }

    Serial.println(F("Iniciando petición HTTP..."));
    Serial.println("Datos a enviar: " + data);

    if (enviarAT("AT+SAPBR=2,1", "OK", 5000) != 1) {
      Serial.println(F("Conexión GPRS perdida, reconectando..."));
      establecerConexionGPRS(apn);
    }

    if (enviarAT("AT+HTTPINIT", "OK", 10000) != 1) {
      Serial.println(F("Fallo al inicializar HTTP"));
      delay(1000);
      continue;
    }

    if (enviarAT("AT+HTTPPARA=\"CID\",1", "OK", 5000) != 1) {
      Serial.println(F("Fallo al configurar CID"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    String urlCommand = "AT+HTTPPARA=\"URL\",\"" + url + "\"";
    if (enviarAT(urlCommand.c_str(), "OK", 5000) != 1) {
      Serial.println(F("Fallo al configurar URL"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    if (enviarAT("AT+HTTPPARA=\"CONTENT\",\"text/plain\"", "OK", 5000) != 1) {
      Serial.println(F("Fallo al configurar content type"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    String dataCommand = "AT+HTTPDATA=" + String(data.length()) + ",30000";
    if (enviarAT(dataCommand.c_str(), "DOWNLOAD", 10000) != 1) {
      Serial.println(F("Fallo al iniciar subida de datos"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    delay(1000);
    SIM900.println(data);
    delay(5000);

    while(SIM900.available()) {
      Serial.write(SIM900.read());
    }

    Serial.println(F("Ejecutando petición POST..."));
    if (enviarAT("AT+HTTPACTION=1", "OK", 5000) != 1) {
      Serial.println(F("Fallo al ejecutar POST"));
      sendCommand("AT+HTTPTERM");
      delay(1000);
      continue;
    }

    waitForHTTPResponse(HTTP_TIMEOUT);
    
    sendCommand("AT+HTTPREAD");
    delay(2000);
    ShowSerialData();

    sendCommand("AT+HTTPTERM");
    delay(1000);
    
    envioCorrecto = true;
    Serial.println(F("Datos enviados correctamente"));

    Serial.println(F("Estado actual de los sensores:"));
    for (int i = 0; i < 6; i++) {
      Serial.print(F("Sensor "));
      Serial.print(i + 1);
      Serial.print(F(": "));
      Serial.println(!digitalRead(pines[i]) ? F("ON") : F("OFF"));
    }
  }

  if (!envioCorrecto) {
    Serial.println(F("Fallo al enviar datos después de todos los intentos"));
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
        Serial.println(F("\nRespuesta exitosa recibida"));
      }
      else if (response.indexOf("+HTTPACTION: 1,") != -1) {
        responseReceived = true;
        Serial.println(F("\nRespuesta recibida con código no-200"));
      }
    }
    delay(100);
  }
  
  if (!responseReceived) {
    Serial.println(F("\nTimeout esperando respuesta HTTP"));
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
    Serial.println(F("Encendiendo SIM900..."));
    pinMode(4, OUTPUT);  // GPIO4 para control de energía
    digitalWrite(4, HIGH);
    delay(1000);
    digitalWrite(4, LOW);
    delay(1000);

    while (respuesta == 0) {
      respuesta = enviarAT("AT", "OK", 2000);
    }
    Serial.println(F("SIM900 encendido completado."));
  }
}

void power_off() {
  digitalWrite(4, HIGH);
  delay(1000);
  digitalWrite(4, LOW);
  delay(1000);
}

void reiniciar() {
  Serial.println(F("Reiniciando SIM900..."));
  power_off();
  delay(5000);
  power_on();
}

void iniciar_Pin() {
  Serial.println(F("Introduciendo PIN..."));
  enviarAT("AT+CPIN=\"5555\"", "OK", 10000);
  Serial.println(F("Conectando a la red..."));
  delay(5000);

  while (enviarAT("AT+CREG?", "+CREG: 0,1", 10000) == 0) {
    delay(5000);
  }
  Serial.println(F("Conectado a la red."));
}

void establecerConexionGPRS(String apn) {
  Serial.println(F("Configurando conexión GPRS..."));
  enviarAT("AT+SAPBR=0,1", "OK", 20000);
  delay(1000);
  enviarAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", "OK", 20000);
  
  String cmd = "AT+SAPBR=3,1,\"APN\",\"" + apn + "\"";
  enviarAT(cmd.c_str(), "OK", 20000);
  
  int intentos = 0;
  bool conexionExitosa = false;
  
  while (!conexionExitosa && intentos < MAX_RETRIES) {
    if (enviarAT("AT+SAPBR=1,1", "OK", 30000) == 1) {
      conexionExitosa = true;
      Serial.println(F("Conexión GPRS exitosa"));
    } else {
      intentos++;
      Serial.print(F("Conexión GPRS fallida, intento "));
      Serial.print(intentos);
      Serial.println(F(" de 3"));
      delay(5000);
    }
  }
  
  if (!conexionExitosa) {
    Serial.println(F("Fallo al establecer conexión GPRS. Reiniciando..."));
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
      startTime = millis();
    }
    delay(10);
  }
  

    if (response.indexOf("ERROR") != -1) {
    Serial.println(F("\n!!! Error detectado en la respuesta !!!"));
    Serial.println("Respuesta completa: " + response);
  }
}

void sendCommand(const char* command) {
  Serial.println("Enviando comando: " + String(command));
  SIM900.println(command);
  delay(500);
  ShowSerialData();
}