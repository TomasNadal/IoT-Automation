from datetime import datetime, timedelta
from ..models import Signal, SensorMetrics

def parse_sensor_states(raw_data):
    parts = raw_data.split(',')
    if len(parts) != 9:
        raise ValueError("Formato de datos invalido")

    unique_id, location, tiempo, *sensor_states = parts
    sensor_states = [state == '1' for state in sensor_states]
    return unique_id, location, tiempo, sensor_states

def add_sensor_data(controlador, sensor_states):
    return Signal(
        tstamp=datetime.now(),
        id=controlador.id,
        value_sensor1=sensor_states[0],
        value_sensor2=sensor_states[1],
        value_sensor3=sensor_states[2],
        value_sensor4=sensor_states[3],
        value_sensor5=sensor_states[4],
        value_sensor6=sensor_states[5]
    )

def update_sensor_metrics(session, controlador, sensor_data, last_signal, key_to_tipo):
    sensor_metrics = session.query(SensorMetrics).filter_by(controlador_id=controlador.id).first()
    if not sensor_metrics:
        sensor_metrics = SensorMetrics(controlador_id=controlador.id)
        session.add(sensor_metrics)

    for key, tipo in key_to_tipo.items():
        value = getattr(sensor_data, key)
        sensor_connected = is_sensor_connected(tipo, value)
        if sensor_connected and last_signal:
            current_time = sensor_data.tstamp.replace(tzinfo=last_signal.tstamp.tzinfo)
            if (current_time - last_signal.tstamp) < timedelta(minutes=5):
                time_difference_minutes = (current_time - last_signal.tstamp).total_seconds() / 60
                sensor_time = getattr(sensor_metrics, f'time_{key}') + time_difference_minutes
                setattr(sensor_metrics, f'time_{key}', sensor_time)
    return sensor_metrics

def is_sensor_connected(tipo, sensor_reading):
    if tipo == "NA":
        return not sensor_reading
    if tipo == "NC":
        return sensor_reading
    return False