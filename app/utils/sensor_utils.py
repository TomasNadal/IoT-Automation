from datetime import datetime, timedelta, timezone
from ..models import Signal, SensorMetrics

def parse_sensor_states(data_string):
    """
    Parse string data from Arduino into controller ID and sensor states
    
    Expected format:
    "+34XXXXXXXXX,Location,1,0,0,1,1,1"
    Where:
    - First value is the controller ID (phone number)
    - Second value is the location
    - Following 6 values are sensor states (1=true, 0=false)
    """
    try:
        parts = data_string.strip().split(',')
        if len(parts) != 8:  # ID, location, 6 sensor values
            raise ValueError(f"Expected 8 values, got {len(parts)}")
            
        controlador_id = parts[0]
        location = parts[1]
        
        # Convert string sensor states to boolean dictionary
        sensor_states = {}
        for i, value in enumerate(parts[2:], 1):
            sensor_states[f'value_sensor{i}'] = value == '1'
                
        return controlador_id, location, datetime.now(timezone.utc), sensor_states
        
    except Exception as e:
        raise ValueError(f"Invalid data format: {str(e)}")

def add_sensor_data(controlador, sensor_states):
    """Create a new signal record from sensor states"""
    server_timestamp = datetime.now(timezone.utc)
    
    new_signal = Signal(
        controlador_id=controlador.id,
        tstamp=server_timestamp,
        value_sensor1=sensor_states['value_sensor1'],
        value_sensor2=sensor_states['value_sensor2'],
        value_sensor3=sensor_states['value_sensor3'],
        value_sensor4=sensor_states['value_sensor4'],
        value_sensor5=sensor_states['value_sensor5'],
        value_sensor6=sensor_states['value_sensor6']
    )
    return new_signal

def update_sensor_metrics(session, controlador, new_signal, last_signal):
    """Update metrics for each sensor"""
    if not last_signal:
        return
        
    metrics = controlador.metrics
    if not metrics:
        metrics = SensorMetrics(controlador_id=controlador.id)
        session.add(metrics)
    
    current_time = new_signal.tstamp
    time_diff = (current_time - last_signal.tstamp).total_seconds() / 60
    
    if time_diff > 5:  # More than 5 minutes between signals
        return
        
    for i in range(1, 7):
        sensor_key = f'value_sensor{i}'
        new_value = getattr(new_signal, sensor_key)
        sensor_config = controlador.config.get(sensor_key, {})
        sensor_tipo = sensor_config.get('tipo', 'NA')
        
        if is_sensor_connected(sensor_tipo, new_value):
            current_time = getattr(metrics, f'time_{sensor_key}', 0.0)
            setattr(metrics, f'time_{sensor_key}', current_time + time_diff)

def is_sensor_connected(tipo, sensor_reading):
    if tipo == "NA":
        return not sensor_reading
    if tipo == "NC":
        return sensor_reading
    return False