from flask import Blueprint, current_app, request, make_response
from flask_restx import Api, Resource, fields
from ..models import Empresa, Controlador, Signal, Aviso
from sqlalchemy.sql import func, case, and_, text
from sqlalchemy import cast, String
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import pytz
from flask_cors import CORS, cross_origin
import uuid
import json

dashboard = Blueprint('dashboard', __name__)
CORS(dashboard)

api = Api(dashboard, version='1.0', title='Dashboard API',
    description='API for IoT Dashboard',
    doc='/doc/'
)

# Define namespaces
ns_dashboard = api.namespace('dashboard', description='Dashboard operations')
ns_controlador = api.namespace('controlador', description='Controller operations')

# Define models
signal_model = api.model('Signal', {
    'id': fields.Integer(description='Signal ID'),
    'tstamp': fields.DateTime(description='Timestamp'),
    'value_sensor1': fields.Boolean(description='Sensor 1 value'),
    'value_sensor2': fields.Boolean(description='Sensor 2 value'),
    'value_sensor3': fields.Boolean(description='Sensor 3 value'),
    'value_sensor4': fields.Boolean(description='Sensor 4 value'),
    'value_sensor5': fields.Boolean(description='Sensor 5 value'),
    'value_sensor6': fields.Boolean(description='Sensor 6 value'),
})

# Now, let's define the updated controlador_model
controlador_model = api.model('Controlador', {
    'id': fields.String(description='Controller ID'),
    'name': fields.String(description='Controller Name'),
    'empresa_id': fields.String(description='Company ID'),
    'config': fields.Raw(description='Controller configuration as JSON'),
    'señales': fields.List(fields.Nested(signal_model))
})

change_model = api.model('Change', {
    'sensor': fields.String(description='Sensor name'),
    'old_value': fields.Boolean(description='Old sensor value'),
    'new_value': fields.Boolean(description='New sensor value')
})

changes_model = api.model('Changes', {
    'timestamp': fields.DateTime(description='Timestamp of change'),
    'changes': fields.List(fields.Nested(change_model))
})

activity_model = api.model('Activity', {
    'timestamp': fields.DateTime(description='Timestamp of activity'),
    'value': fields.Boolean(description='Sensor value')
})

sensor_activity_model = api.model('SensorActivity', {
    'value_sensor1': fields.List(fields.Nested(activity_model)),
    'value_sensor2': fields.List(fields.Nested(activity_model)),
    'value_sensor3': fields.List(fields.Nested(activity_model)),
    'value_sensor4': fields.List(fields.Nested(activity_model)),
    'value_sensor5': fields.List(fields.Nested(activity_model)),
    'value_sensor6': fields.List(fields.Nested(activity_model))
})

uptime_model = api.model('Uptime', {
    'value_sensor1': fields.Float(description='Uptime percentage for sensor 1'),
    'value_sensor2': fields.Float(description='Uptime percentage for sensor 2'),
    'value_sensor3': fields.Float(description='Uptime percentage for sensor 3'),
    'value_sensor4': fields.Float(description='Uptime percentage for sensor 4'),
    'value_sensor5': fields.Float(description='Uptime percentage for sensor 5'),
    'value_sensor6': fields.Float(description='Uptime percentage for sensor 6')
})

correlation_model = api.model('Correlation', {
    'value_sensor1': fields.Raw(description='Correlation for sensor 1'),
    'value_sensor2': fields.Raw(description='Correlation for sensor 2'),
    'value_sensor3': fields.Raw(description='Correlation for sensor 3'),
    'value_sensor4': fields.Raw(description='Correlation for sensor 4'),
    'value_sensor5': fields.Raw(description='Correlation for sensor 5'),
    'value_sensor6': fields.Raw(description='Correlation for sensor 6')
})

alert_model = api.model('Alert', {
    'id': fields.String(description='Alert ID'),
    'controlador_id': fields.String(description='Controller ID'),
    'config': fields.Raw(description='Alert configuration')
})

config_model = api.model('Config', {
    'config': fields.Raw(description='Controller configuration')
})


@ns_dashboard.route("/")
class DashboardTest(Resource):
    def get(self):
        return json.dumps({"Hey":200})



@ns_dashboard.route('/empresa/<string:empresa_id>/dashboard')
class DashboardData(Resource):
    @ns_dashboard.doc('get_dashboard_data')
    @ns_dashboard.marshal_list_with(controlador_model)
    def get(self, empresa_id):
        """Fetch dashboard data for a company"""
        try:
            with current_app.db_factory() as session:
                controladores = session.query(Controlador).filter_by(empresa_id=empresa_id).all()
                
                controladores_list = []
                for controlador in controladores:
                    signals = session.query(Signal).filter_by(controlador_id=controlador.id).order_by(Signal.tstamp.desc()).limit(10).all()
                    
                    controlador_dict = controlador.to_dict()
                    controlador_dict['señales'] = [signal.to_dict() for signal in signals]
                    controladores_list.append(controlador_dict)

                return controladores_list
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

@ns_controlador.route('/<string:controlador_id>/sensor/<string:sensor_id>/connection-data')
class SensorConnectionData(Resource):
    @ns_controlador.doc('get_sensor_connection_data')
    def get(self, controlador_id, sensor_id):
        """Fetch connection data for a specific sensor"""
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
        
        return connection_data

@ns_dashboard.route('/empresa/<string:id>/connected_stats')
class ConnectedStats(Resource):
    @ns_dashboard.doc('get_connected_stats')
    def get(self, id):
        """Get connected and disconnected controller counts for a company"""
        try:
            with current_app.db_factory() as session:
                controladores = session.query(Controlador).filter_by(empresa_id=id).all()
                connected_count = sum(1 for controlador in controladores if is_controlador_connected(controlador, session))
                disconnected_count = len(controladores) - connected_count

                return {
                    "connected": connected_count,
                    "disconnected": disconnected_count
                }
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

@ns_controlador.route('/<string:controlador_id>/detail')
class ControllerDetail(Resource):
    @ns_controlador.doc('get_controller_detail')
    @ns_controlador.marshal_with(controlador_model)
    def get(self, controlador_id):
        """Fetch details for a specific controller"""
        try:
            with current_app.db_factory() as session:
                controlador = session.query(Controlador).filter_by(id=controlador_id).first()
                if not controlador:
                    api.abort(404, "Controller not found")

                signals = session.query(Signal).filter_by(id=controlador_id).order_by(Signal.tstamp.desc()).limit(100).all()
                
                controlador_data = controlador.to_dict()
                controlador_data['señales'] = [signal.to_dict() for signal in signals]
            
                return controlador_data
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

@ns_controlador.route('/<string:controlador_id>/changes')
class ControllerChanges(Resource):
    @ns_controlador.doc('get_controller_changes')
    @ns_controlador.marshal_list_with(changes_model)
    def get(self, controlador_id):
        """Fetch changes for a specific controller"""
        try:
            with current_app.db_factory() as session:
                changes = controlador_changes(session, controlador_id)
                return changes
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

@ns_controlador.route('/<string:controlador_id>/sensor_activity')
class SensorActivity(Resource):
    @ns_controlador.doc('get_sensor_activity')
    @ns_controlador.marshal_with(sensor_activity_model)
    def get(self, controlador_id):
        """Fetch sensor activity for a specific controller"""
        try:
            with current_app.db_factory() as session:
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
                            'timestamp': signal.tstamp,
                            'value': getattr(signal, sensor)
                        })
            
                return activity_data
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

@ns_controlador.route('/<string:controlador_id>/sensor_uptime')
class SensorUptime(Resource):
    @ns_controlador.doc('get_sensor_uptime')
    @ns_controlador.marshal_with(uptime_model)
    def get(self, controlador_id):
        """Fetch sensor uptime for a specific controller"""
        try:
            with current_app.db_factory() as session:
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
            
                return uptime_data
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

@ns_controlador.route('/<string:controlador_id>/sensor_correlation')
class SensorCorrelation(Resource):
    @ns_controlador.doc('get_sensor_correlation')
    @ns_controlador.marshal_with(correlation_model)
    def get(self, controlador_id):
        """Fetch sensor correlation for a specific controller"""
        try:
            with current_app.db_factory() as session:
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
            
                return correlation_matrix
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

@ns_controlador.route('/<string:controlador_id>/alerts')
class ControllerAlerts(Resource):
    @ns_controlador.doc('get_alerts')
    @ns_controlador.marshal_list_with(alert_model)
    def get(self, controlador_id):
        """Fetch alerts for a specific controller"""
        try:
            with current_app.db_factory() as session:
                avisos = session.query(Aviso).filter_by(controlador_id=controlador_id).order_by(Aviso.id.desc()).limit(10).all()
                return [aviso.to_dict() for aviso in avisos]
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")


@ns_controlador.route('/<string:controlador_id>/config')
class ControllerConfig(Resource):
    @ns_controlador.doc('get_controller_config')
    @ns_controlador.marshal_with(config_model)
    @cross_origin(origin='http://localhost:5173', methods=['GET', 'POST', 'OPTIONS'])
    def get(self, controlador_id):
        """Get controller configuration"""
        try:
            with current_app.db_factory() as session:
                controlador = session.query(Controlador).filter_by(id=controlador_id).first()
                if not controlador:
                    api.abort(404, "Controller not found")
                return {'config': controlador.config}
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

    @ns_controlador.doc('update_controller_config')
    @ns_controlador.expect(config_model)
    @cross_origin(origin='http://localhost:5173', methods=['GET', 'POST', 'OPTIONS'])
    def post(self, controlador_id):
        """Update controller configuration"""
        try:
            with current_app.db_factory() as session:
                controlador = session.query(Controlador).filter_by(id=controlador_id).first()
                if not controlador:
                    api.abort(404, "Controller not found")

                new_config = request.json.get('config')
                if not new_config:
                    api.abort(400, "No configuration provided")

                """"if not validate_config(new_config):
                    api.abort(400, "Invalid configuration format")"""

                controlador.config = new_config
                session.commit()

                return {'message': 'Configuration updated successfully'}
        except Exception as e:
            api.abort(500, f"An error occurred: {str(e)}")

    @ns_controlador.doc('options_controller_config')
    @cross_origin(origin='http://localhost:5173', methods=['GET', 'POST', 'OPTIONS'])
    def options(self, controlador_id):
        """Handle OPTIONS request for CORS"""
        response = make_response()
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response
    
def controlador_changes(session, controlador_id, limit=100):
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

def is_controlador_connected(controlador, session):
    try:
        controlador_id = str(controlador.id)  # Ensure it's a string
        
        # Use a text-based query to avoid type casting issues
        query = text("SELECT tstamp FROM signals WHERE controlador_id = :id ORDER BY tstamp DESC LIMIT 1")
        result = session.execute(query, {"id": controlador_id}).first()
        
        if result:
            last_sample_time = result[0]
            return last_sample_time > datetime.now(pytz.timezone('Europe/Paris')) - timedelta(minutes=5)
        return False
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error in is_controlador_connected: {str(e)}")
        session.rollback()  # Roll back the transaction on error
        return False
    except Exception as e:
        current_app.logger.error(f"Error in is_controlador_connected: {str(e)}")
        return False

def fetch_sensor_connection_data(controlador_id, sensor_id, start_datetime, end_datetime):
    utc = pytz.UTC
    
    start_datetime = start_datetime.astimezone(utc)
    end_datetime = end_datetime.astimezone
