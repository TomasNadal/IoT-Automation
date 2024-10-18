from flask import Blueprint, jsonify, current_app, request, make_response, g
from ..models import db, Empresa, Controlador, Signal, Aviso
from sqlalchemy.sql import func, case, and_, text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import pytz
from flask_cors import cross_origin
from flask_cors import CORS
from flask_caching import Cache
import time
from functools import wraps
from ..db_utils import db_connection_logger

dashboard = Blueprint('dashboard', __name__)
CORS(dashboard)
cache = Cache(config={'CACHE_TYPE': 'simple'})

@dashboard.before_request
def before_request():
    g.start_time = time.time()
    current_app.logger.info(f"Starting request: {request.path}")

@dashboard.after_request
def after_request(response):
    diff = time.time() - g.start_time
    current_app.logger.info(f"Request completed: {request.path}, took {diff:.2f} seconds")
    return response

@dashboard.route('/empresa/<int:empresa_id>/dashboard', methods=['GET'])
def get_dashboard_data(empresa_id):
    try:
        with db_connection_logger() as session:
            subquery = session.query(
                Signal.id,
                Signal.tstamp,
                Signal.value_sensor1,
                Signal.value_sensor2,
                Signal.value_sensor3,
                Signal.value_sensor4,
                Signal.value_sensor5,
                Signal.value_sensor6,
                func.row_number().over(
                    partition_by=Signal.id,
                    order_by=Signal.tstamp.desc()
                ).label('row_num')
            ).subquery()

            controladores_with_signals = session.query(
                Controlador,
                subquery.c.tstamp,
                subquery.c.value_sensor1,
                subquery.c.value_sensor2,
                subquery.c.value_sensor3,
                subquery.c.value_sensor4,
                subquery.c.value_sensor5,
                subquery.c.value_sensor6
            ).outerjoin(
                subquery, subquery.c.id == Controlador.id
            ).filter(
                Controlador.id_empresa == empresa_id,
                subquery.c.row_num <= 10
            ).all()

            controladores_dict = {}
            for result in controladores_with_signals:
                controlador = result[0]
                signal_data = {
                    'tstamp': result[1],
                    'value_sensor1': result[2],
                    'value_sensor2': result[3],
                    'value_sensor3': result[4],
                    'value_sensor4': result[5],
                    'value_sensor5': result[6],
                    'value_sensor6': result[7],
                }

                if controlador.id not in controladores_dict:
                    controladores_dict[controlador.id] = controlador.to_dict()
                    controladores_dict[controlador.id]['last_signal'] = signal_data

            controladores_list = list(controladores_dict.values())
            return jsonify(controladores_list), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_dashboard_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@dashboard.route('/controlador/<int:controlador_id>/sensor/<string:sensor_id>/connection-data', methods=['GET'])
def get_sensor_connection_data(controlador_id, sensor_id):
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    start_time = request.args.get('startTime')
    end_time = request.args.get('endTime')
    
    utc = pytz.UTC
    
    def parse_and_convert_to_utc(date_str, time_str=None):
        if 'T' in date_str:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(f"{date_str}T{'00:00' if time_str is None else time_str}")
        
        if dt.tzinfo is None:
            return utc.localize(dt)
        return dt.astimezone(utc)

    start_datetime = parse_and_convert_to_utc(start_date, start_time)
    end_datetime = parse_and_convert_to_utc(end_date, end_time)
    
    if end_datetime <= start_datetime:
        end_datetime += timedelta(days=1)
    
    connection_data = fetch_sensor_connection_data(controlador_id, sensor_id, start_datetime, end_datetime)
    
    return jsonify(connection_data)

@dashboard.route("/empresa/<int:id>/connected_stats", methods=["GET"])
def get_connected_stats(id):
    try:
        with db_connection_logger() as session:
            controladores = session.query(Controlador).filter_by(id_empresa=id).all()
            connected_count = sum(1 for controlador in controladores if is_controlador_connected(controlador))
            disconnected_count = len(controladores) - connected_count

            return jsonify({
                "connected": connected_count,
                "disconnected": disconnected_count
            }), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_connected_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@dashboard.route('/controlador/<int:controlador_id>/detail', methods=['GET'])
def get_controller_detail(controlador_id):
    try:
        with db_connection_logger() as session:
            controlador = session.query(Controlador).filter_by(id=controlador_id).first()
            if not controlador:
                return jsonify({'error': 'Controller not found'}), 404

            signals = session.query(Signal).filter_by(id=controlador_id).order_by(Signal.tstamp.desc()).limit(100).all()
            
            controlador_data = controlador.to_dict()
            controlador_data['señales'] = [signal.to_dict() for signal in signals]
        
            return jsonify(controlador_data), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_controller_detail: {str(e)}")
        return jsonify({'error': str(e)}), 500

@dashboard.route('/controlador/<int:controlador_id>/changes', methods=['GET'])
def get_controller_changes(controlador_id):
    try:
        with db_connection_logger() as session:
            changes = controlador_changes(session, controlador_id)
            return jsonify(changes), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_controller_changes: {str(e)}")
        return jsonify({'error': str(e)}), 500

@dashboard.route('/controlador/<int:controlador_id>/sensor_activity', methods=['GET'])
def get_sensor_activity(controlador_id):
    try:
        with db_connection_logger() as session:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)
            
            signals = session.query(Signal).filter(
                Signal.id == controlador_id,
                Signal.tstamp.between(start_time, end_time)
            ).order_by(Signal.tstamp).all()
            
            activity_data = {sensor: [] for sensor in ['value_sensor1', 'value_sensor2', 'value_sensor3', 'value_sensor4', 'value_sensor5', 'value_sensor6']}
            
            for signal in signals:
                for sensor in activity_data:
                    activity_data[sensor].append({
                        'timestamp': signal.tstamp.isoformat(),
                        'value': getattr(signal, sensor)
                    })
        
            return jsonify(activity_data)
    except Exception as e:
        current_app.logger.error(f"Error in get_sensor_activity: {str(e)}")
        return jsonify({'error': str(e)}), 500

@dashboard.route('/controlador/<int:controlador_id>/sensor_uptime', methods=['GET'])
def get_sensor_uptime(controlador_id):
    try:
        with db_connection_logger() as session:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)
            
            uptime_data = {}
            for sensor in ['value_sensor1', 'value_sensor2', 'value_sensor3', 'value_sensor4', 'value_sensor5', 'value_sensor6']:
                total_time = session.query(Signal).filter(
                    Signal.id == controlador_id,
                    Signal.tstamp.between(start_time, end_time)
                ).count()
                
                uptime = session.query(Signal).filter(
                    Signal.id == controlador_id,
                    Signal.tstamp.between(start_time, end_time),
                    getattr(Signal, sensor) == True
                ).count()
                
                uptime_data[sensor] = (uptime / total_time) * 100 if total_time > 0 else 0
        
            return jsonify(uptime_data)
    except Exception as e:
        current_app.logger.error(f"Error in get_sensor_uptime: {str(e)}")
        return jsonify({'error': str(e)}), 500

@dashboard.route('/controlador/<int:controlador_id>/sensor_correlation', methods=['GET'])
def get_sensor_correlation(controlador_id):
    try:
        with db_connection_logger() as session:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)
            
            signals = session.query(Signal).filter(
                Signal.id == controlador_id,
                Signal.tstamp.between(start_time, end_time)
            ).all()
            
            sensors = ['value_sensor1', 'value_sensor2', 'value_sensor3', 'value_sensor4', 'value_sensor5', 'value_sensor6']
            correlation_matrix = {s1: {s2: 0 for s2 in sensors} for s1 in sensors}
            
            for s1 in sensors:
                for s2 in sensors:
                    if s1 != s2:
                        correlation = sum(1 for signal in signals if getattr(signal, s1) == getattr(signal, s2))
                        correlation_matrix[s1][s2] = correlation / len(signals) if signals else 0
        
            return jsonify(correlation_matrix)
    except Exception as e:
        current_app.logger.error(f"Error in get_sensor_correlation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@dashboard.route('/controlador/<int:controlador_id>/alerts', methods=['GET'])
def get_alerts(controlador_id):
    try:
        with db_connection_logger() as session:
            avisos = session.query(Aviso).filter_by(id_controlador=controlador_id).order_by(Aviso.id.desc()).limit(10).all()
            return jsonify([aviso.to_dict() for aviso in avisos]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching avisos for controller {controlador_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard.route('/<int:controlador_id>/config', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin(origin='http://localhost:5173', methods=['GET', 'POST', 'OPTIONS'])
def handle_controlador_config(controlador_id):
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response

    try:
        with db_connection_logger() as session:
            controlador = session.query(Controlador).filter_by(id=controlador_id).first()
            if not controlador:
                return jsonify({'error': 'Controller not found'}), 404

            if request.method == 'GET':
                return jsonify(controlador.config), 200

            elif request.method == 'POST':
                new_config = request.json.get('config')
                if not new_config:
                    return jsonify({'error': 'No configuration provided'}), 400

                if not validate_config(new_config):
                    return jsonify({'error': 'Invalid configuration format'}), 400

                controlador.config = new_config
                session.commit()

                return jsonify({'message': 'Configuration updated successfully'}), 200
    except SQLAlchemyError as e:
        session.rollback()
        current_app.logger.error(f"Database error in handle_controlador_config: {str(e)}")
        return jsonify({'error': 'Database error', 'details': str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Error in handle_controlador_config: {str(e)}")
        return jsonify({'error': str(e)}), 500

def controlador_changes(session, controlador_id, limit=1000):
    controlador_signals = session.query(Signal).filter_by(id=controlador_id).order_by(Signal.tstamp.desc()).limit(limit).all()
    changed_signals = []
    if controlador_signals:
        sensor_names = ['value_sensor1', 'value_sensor2', 'value_sensor3', 'value_sensor4', 'value_sensor5', 'value_sensor6']
        
        previous_values = {name: getattr(controlador_signals[0], name) for name in sensor_names}

        for signal in controlador_signals[1:]:
            changes = []
            current_values = {name: getattr(signal, name) for name in sensor_names}

            for name in sensor_names:
                if current_values[name] != previous_values[name]:
                    changes.append({
                        'sensor': name,
                        'old_value': previous_values[name],
                        'new_value': current_values[name]
                    })

            if changes:
                changed_signals.append({
                    'timestamp': signal.tstamp.isoformat(),
                    'changes': changes
                })

            previous_values = current_values

    return changed_signals

def is_controlador_connected(controlador):
    with db_connection_logger() as session:
        last_sample = session.query(Signal).filter_by(id=controlador.id).order_by(Signal.tstamp.desc()).first()
        if last_sample:
            return last_sample.tstamp > datetime.now(pytz.timezone('Europe/Paris')) - timedelta(minutes=5)
    return False

def fetch_sensor_connection_data(controlador_id, sensor_id, start_datetime, end_datetime):
    utc = pytz.UTC
    
    start_datetime = start_datetime.astimezone(utc)
    end_datetime = end_datetime.astimezone(utc)

    try:
        with db_connection_logger() as session:
            signals = session.query(
                Signal.tstamp,
                getattr(Signal, sensor_id).label('sensor_value')
            ).filter(
                Signal.id == controlador_id,
                Signal.tstamp.between(start_datetime, end_datetime)
            ).order_by(Signal.tstamp).all()

            connection_data = []
            current_datetime = start_datetime
            
            while current_datetime < end_datetime:
                next_datetime = min(current_datetime.replace(hour=23, minute=59, second=59, microsecond=999999), end_datetime)
                
                day_signals = [s for s in signals if current_datetime <= s.tstamp.replace(tzinfo=utc) <= next_datetime]
                
                connected_minutes = 0
                disconnected_minutes = 0
                no_data_minutes = 0
                
                if day_signals:
                    last_signal_time = current_datetime
                    last_sensor_state = None
                    
                    for signal in day_signals:
                        signal_time = signal.tstamp.replace(tzinfo=utc)
                        time_diff = (signal_time - last_signal_time).total_seconds() / 60
                        
                        if time_diff > 5:  # More than 5 minutes between signals
                            no_data_minutes += time_diff
                        else:
                            if last_sensor_state is not None:
                                if last_sensor_state:
                                    connected_minutes += time_diff
                                else:
                                    disconnected_minutes += time_diff
                        
                        last_signal_time = signal_time
                        last_sensor_state = signal.sensor_value
                    
                    remaining_time = (next_datetime - last_signal_time).total_seconds() / 60
                    if remaining_time > 5:
                        no_data_minutes += remaining_time
                    else:
                        if last_sensor_state:
                            connected_minutes += remaining_time
                        else:
                            disconnected_minutes += remaining_time
                else:
                    no_data_minutes = (next_datetime - current_datetime).total_seconds() / 60
                
                connection_data.append({
                    'date': current_datetime.isoformat(),
                    'connected': round(connected_minutes, 2),
                    'disconnected': round(disconnected_minutes, 2),
                    'noData': round(no_data_minutes, 2)
                })
                
                current_datetime = next_datetime + timedelta(seconds=1)

            return connection_data
    except Exception as e:
        current_app.logger.error(f"Error in fetch_sensor_connection_data: {str(e)}")
        return []

def validate_config(config):
    required_keys = ['name', 'tipo', 'email']
    valid_names = ['Aceite', 'Lleno', 'Magnetotermico', 'Listo', 'Marcha', 'Temperatura']
    valid_tipos = ['NA', 'NC']

    for sensor, sensor_config in config.items():
        if not all(key in sensor_config for key in required_keys):
            return False
        if sensor_config['name'] not in valid_names:
            return False
        if sensor_config['tipo'] not in valid_tipos:
            return False
        if not isinstance(sensor_config['email'], bool):
            return False

    return True
