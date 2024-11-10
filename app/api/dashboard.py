from flask import Blueprint, current_app, request, make_response, jsonify
from flask_restx import Api, Resource, fields
from ..models import Empresa, Controlador, Signal, Aviso, AvisoLog, SensorMetrics
from sqlalchemy.sql import func, case, and_, text
from sqlalchemy import cast, String
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import pytz
from flask_cors import CORS, cross_origin
import uuid
from sqlalchemy.exc import IntegrityError
import logging
import json
from ..services.service_analytics import CycleAnalyticsService

dashboard = Blueprint('dashboard', __name__)
CORS(dashboard)

@dashboard.after_request
def after_request(response):
    allowed_origins = [
        'http://localhost:5173',
        'https://iot-automation.pages.dev'
    ]
    origin = request.headers.get('Origin')
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


logger = logging.getLogger(__name__)
def handle_database_error(e):
    logger.error(f"Database error: {str(e)}")
    return jsonify({"error": "Database connection error. Please try again later."}), 503

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

@ns_controlador.route('/<string:controlador_id>/sensor/<string:sensor_id>/connection-data')
class SensorConnectionData(Resource):
    @ns_controlador.doc('get_sensor_connection_data')
    def get(self, controlador_id, sensor_id):
        """Fetch connection data for a specific sensor"""
        try:
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
        
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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

                signals = session.query(Signal).filter_by(controlador_id=controlador_id).order_by(Signal.tstamp.desc()).limit(10).all()
                
                controlador_data = controlador.to_dict()
                controlador_data['señales'] = [signal.to_dict() for signal in signals]
            
                return controlador_data
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500


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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

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
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    @ns_controlador.doc('options_controller_config')
    @cross_origin(origin='http://localhost:5173', methods=['GET', 'POST', 'OPTIONS'])
    def options(self, controlador_id):
        """Handle OPTIONS request for CORS"""
        response = make_response()
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response




@ns_dashboard.route('/empresa/<string:empresa_id>/components')
class CompanyComponents(Resource):
    @ns_dashboard.doc('get_company_components')
    def get(self, empresa_id):
        """Fetch all components (controllers) for a company"""
        try:
            with current_app.db_factory() as session:
                empresa = session.query(Empresa).filter_by(id=empresa_id).first()
                if not empresa:
                    return {"error": "Company not found"}, 404

                controladores = session.query(Controlador).filter_by(empresa_id=empresa_id).all()
                
                components = []
                for controlador in controladores:
                    last_signal = session.query(Signal).filter_by(controlador_id=controlador.id).order_by(Signal.tstamp.desc()).first()
                    components.append({
                        "id": controlador.id,
                        "name": controlador.name,
                        "config": controlador.config,
                        "last_signal": last_signal.to_dict() if last_signal else None
                    })

                return {
                    "company_name": empresa.name,
                    "components": components
                }
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            current_app.logger.error(f"Unexpected error: {str(e)}")
            return {"error": "An unexpected error occurred. Please try again later."}, 500



def controlador_changes(session, controlador_id, limit=3):
    controlador_signals = session.query(Signal).filter_by(controlador_id=controlador_id).order_by(Signal.tstamp.desc()).limit(limit).all()
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

# Add this to your dashboard.py file



@ns_controlador.route('/<string:controlador_id>/uptime-downtime')
class ControllerUptimeDowntime(Resource):
    @ns_controlador.doc('get_controller_uptime_downtime')
    def get(self, controlador_id):
        """Fetch uptime/downtime data for a specific controller"""
        try:
            with current_app.db_factory() as session:
                controlador = session.query(Controlador).filter_by(id=controlador_id).first()
                if not controlador:
                    return {"error": "Controller not found"}, 404

                utc = pytz.UTC
                end_date = datetime.now(utc)
                start_date = end_date - timedelta(days=7)  # Get data for the last week
                if 'start_date' in request.args:
                    start_date = datetime.fromisoformat(request.args['start_date']).replace(tzinfo=utc)
                if 'end_date' in request.args:
                    end_date = datetime.fromisoformat(request.args['end_date']).replace(tzinfo=utc)

                signals = session.query(Signal).filter(
                    Signal.controlador_id == controlador_id,
                    Signal.tstamp.between(start_date, end_date)
                ).order_by(Signal.tstamp).all()

                daily_activity = {}
                current_date = start_date.date()
                while current_date <= end_date.date():
                    daily_activity[current_date.isoformat()] = []
                    current_date += timedelta(days=1)

                if not signals:
                    # If no signals, mark entire period as off
                    self.add_interval(daily_activity, start_date, end_date, 'off')
                    return {
                        "controller_name": controlador.name,
                        "daily_activity": daily_activity
                    }

                # Initialize with first interval if needed
                if signals[0].tstamp > start_date:
                    self.add_interval(daily_activity, start_date, signals[0].tstamp, 'off')

                # Process signals
                current_state = 'off'
                last_signal_time = signals[0].tstamp

                for i in range(len(signals)):
                    signal = signals[i]
                    signal_time = signal.tstamp.replace(tzinfo=utc)
                    
                    # Determine if this is a state change that requires a new interval
                    time_gap = (signal_time - last_signal_time).total_seconds()
                    
                    if time_gap > 300:  # 5-minute gap indicates disconnection
                        if current_state == 'on':
                            # Add the active period and the gap
                            self.add_interval(daily_activity, last_signal_time, 
                                           last_signal_time + timedelta(seconds=300), 'on')
                            self.add_interval(daily_activity, 
                                           last_signal_time + timedelta(seconds=300),
                                           signal_time, 'off')
                        else:
                            # Just add the gap as off time
                            self.add_interval(daily_activity, last_signal_time, signal_time, 'off')
                        
                        # Start new on period
                        current_state = 'on'
                    elif i == 0 or time_gap > 0:  # Only add non-duplicate timestamps
                        if current_state == 'off':
                            current_state = 'on'
                            # Start new on period
                            self.add_interval(daily_activity, signal_time, 
                                           signal_time + timedelta(seconds=300), 'on')

                    last_signal_time = signal_time

                # Handle final interval
                final_time = min(end_date, last_signal_time + timedelta(seconds=300))
                if current_state == 'on':
                    self.add_interval(daily_activity, last_signal_time, final_time, 'on')
                if final_time < end_date:
                    self.add_interval(daily_activity, final_time, end_date, 'off')

                # Merge consecutive intervals with same state
                for date in daily_activity:
                    merged = []
                    for activity in daily_activity[date]:
                        if (not merged or 
                            merged[-1]['state'] != activity['state'] or 
                            self._time_diff(merged[-1]['end_time'], activity['start_time']) > 1):
                            merged.append(activity)
                        else:
                            merged[-1]['end_time'] = activity['end_time']
                    daily_activity[date] = merged

                return {
                    "controller_name": controlador.name,
                    "daily_activity": daily_activity
                }

        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            current_app.logger.error(f"Unexpected error: {str(e)}")
            return {"error": "An unexpected error occurred. Please try again later."}, 500

    def add_interval(self, daily_activity, start_time, end_time, state):
        """Add an interval to the daily activity, handling cross-day intervals"""
        start_date = start_time.date().isoformat()
        end_date = end_time.date().isoformat()

        if start_date == end_date:
            daily_activity[start_date].append({
                'start_time': start_time.time().isoformat(),
                'end_time': end_time.time().isoformat(),
                'state': state
            })
        else:
            # Split interval across days
            daily_activity[start_date].append({
                'start_time': start_time.time().isoformat(),
                'end_time': '23:59:59',
                'state': state
            })
            
            current_date = start_time.date() + timedelta(days=1)
            while current_date < end_time.date():
                daily_activity[current_date.isoformat()].append({
                    'start_time': '00:00:00',
                    'end_time': '23:59:59',
                    'state': state
                })
                current_date += timedelta(days=1)
            
            daily_activity[end_date].append({
                'start_time': '00:00:00',
                'end_time': end_time.time().isoformat(),
                'state': state
            })

    def _time_diff(self, time1_str, time2_str):
        """Calculate difference between two time strings in seconds"""
        t1 = datetime.strptime(time1_str, '%H:%M:%S.%f' if '.' in time1_str else '%H:%M:%S')
        t2 = datetime.strptime(time2_str, '%H:%M:%S.%f' if '.' in time2_str else '%H:%M:%S')
        return abs((t2 - t1).total_seconds())


@ns_controlador.route('/<string:controlador_id>/analytics')
class ControllerAnalytics(Resource):
    @ns_controlador.doc('get_controller_analytics')  # Changed from @dashboard.doc to @ns_controlador.doc
    def get(self, controlador_id):
        try:
            days = request.args.get('days', 7, type=int)
            with current_app.db_factory() as session:
                analytics_service = CycleAnalyticsService(session)
                analytics = analytics_service.get_cycle_analytics(controlador_id, days)
                if not analytics:
                    return {"error": "No data available"}, 404
                return analytics
        except Exception as e:
            return {"error": str(e)}, 500
            
@ns_controlador.route('/<string:controlador_id>/operational-hours')
class ControllerOperationalHours(Resource):
    @ns_controlador.doc('get_controller_operational_hours')
    def get(self, controlador_id):
        """Fetch operational hours data for a specific controller"""
        try:
            with current_app.db_factory() as session:
                controlador = session.query(Controlador).filter_by(id=controlador_id).first()
                if not controlador:
                    return {"error": "Controller not found"}, 404

                end_date = datetime.now()
                start_date = end_date - timedelta(days=7)  # Get data for the last week
                if 'start_date' in request.args:
                    start_date = datetime.fromisoformat(request.args['start_date'])
                if 'end_date' in request.args:
                    end_date = datetime.fromisoformat(request.args['end_date'])

                signals = session.query(Signal).filter(
                    Signal.controlador_id == controlador_id,
                    Signal.tstamp.between(start_date, end_date)
                ).order_by(Signal.tstamp).all()

                heatmap_data = {}
                current_date = start_date.date()
                while current_date <= end_date.date():
                    heatmap_data[current_date.isoformat()] = [0] * 24
                    current_date += timedelta(days=1)

                for signal in signals:
                    signal_date = signal.tstamp.date()
                    signal_hour = signal.tstamp.hour

                    # Check if any sensor is active based on the configuration
                    is_active = any(
                        (config['tipo'] == 'NA' and getattr(signal, sensor_key)) or
                        (config['tipo'] == 'NC' and not getattr(signal, sensor_key))
                        for sensor_key, config in controlador.config.items()
                    )

                    if is_active:
                        heatmap_data[signal_date.isoformat()][signal_hour] += 5  # Increment by 5 minutes

                return {
                    "controller_name": controlador.name,
                    "heatmap_data": heatmap_data,
                    "sensor_config": controlador.config
                }

        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            current_app.logger.error(f"Unexpected error: {str(e)}")
            return {"error": "An unexpected error occurred. Please try again later."}, 500

@ns_dashboard.route('/controlador')
class AddControlador(Resource):
    @ns_dashboard.doc('add_controlador')
    @ns_dashboard.expect(api.model('NewControlador', {
        'name': fields.String(required=True, description='Controller name'),
        'id': fields.String(required=True, description='Controller ID'),
        'empresa_id': fields.String(required=True, description='Company ID'),
        'config': fields.Raw(required=True, description='Controller configuration')
    }))
    def post(self):
        """Add a new controller"""
        data = request.json
        try:
            with current_app.db_factory() as session:
                empresa = session.query(Empresa).get(data['empresa_id'])
                if not empresa:
                    return {'message': 'Company not found'}, 404

                new_controlador = Controlador(
                    id=data['id'],
                    name=data['name'],
                    empresa_id=data['empresa_id'],
                    config=data['config']  # Use the config from the request
                )
                session.add(new_controlador)
                session.commit()
                return new_controlador.to_dict(), 201
        except IntegrityError:
            return {'message': 'Controller ID already exists'}, 400
        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            current_app.logger.error(f"Unexpected error: {str(e)}")
            return {'message': 'An unexpected error occurred'}, 500

def handle_database_error(e):
    current_app.logger.error(f"Database error: {str(e)}")
    return {'message': 'A database error occurred'}, 500





@ns_controlador.route('/<string:controlador_id>/timeline')
class ControllerTimeline(Resource):
    @ns_controlador.doc('get_controller_timeline')
    def get(self, controlador_id):
        """Fetch activity data for a specific controller"""
        try:
            with current_app.db_factory() as session:
                controlador = session.query(Controlador).filter_by(id=controlador_id).first()
                if not controlador:
                    return {"error": "Controller not found"}, 404

                end_date = datetime.now()
                start_date = end_date - timedelta(days=7)  # Get data for the last week
                if 'start_date' in request.args:
                    start_date = datetime.fromisoformat(request.args['start_date'])
                if 'end_date' in request.args:
                    end_date = datetime.fromisoformat(request.args['end_date'])

                signals = session.query(Signal).filter(
                    Signal.controlador_id == controlador_id,
                    Signal.tstamp.between(start_date, end_date)
                ).order_by(Signal.tstamp).all()

                daily_activity = {}
                heatmap_data = {}
                current_date = start_date.date()
                while current_date <= end_date.date():
                    daily_activity[current_date.isoformat()] = []
                    heatmap_data[current_date.isoformat()] = [0] * 24
                    current_date += timedelta(days=1)

                last_signal_time = None
                for signal in signals:
                    signal_date = signal.tstamp.date()
                    signal_hour = signal.tstamp.hour

                    if last_signal_time and (signal.tstamp - last_signal_time).total_seconds() > 300:
                        # Add a downtime period
                        daily_activity[signal_date.isoformat()].append({
                            "start": last_signal_time.isoformat(),
                            "end": signal.tstamp.isoformat(),
                            "status": "downtime"
                        })
                    else:
                        # Increment the active minutes for this hour
                        heatmap_data[signal_date.isoformat()][signal_hour] += 5

                    # Add an uptime period
                    daily_activity[signal_date.isoformat()].append({
                        "start": signal.tstamp.isoformat(),
                        "end": (signal.tstamp + timedelta(minutes=5)).isoformat(),
                        "status": "uptime"
                    })

                    last_signal_time = signal.tstamp

                return {
                    "controller_name": controlador.name,
                    "daily_activity": daily_activity,
                    "heatmap_data": heatmap_data
                }

        except SQLAlchemyError as e:
            return handle_database_error(e)
        except Exception as e:
            current_app.logger.error(f"Unexpected error: {str(e)}")
            return {"error": "An unexpected error occurred. Please try again later."}, 500
        



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

@ns_dashboard.route('/controlador/<string:controlador_id>')
class ControladorResource(Resource):
    @ns_dashboard.doc('delete_controlador')
    def delete(self, controlador_id):
        """Delete a controller and all its related data"""
        session = current_app.db_factory()
        try:
            logger.info(f"Starting deletion process for controller {controlador_id}")
            
            # Get all alert IDs for this controller first
            alert_ids = [alert.id for alert in session.query(Aviso).filter_by(controlador_id=controlador_id).all()]
            
            if alert_ids:
                # Delete alert logs first (child records)
                alert_logs_deleted = session.query(AvisoLog).filter(AvisoLog.aviso_id.in_(alert_ids)).delete(synchronize_session='fetch')
                logger.info(f"Deleted {alert_logs_deleted} alert logs")

            # Delete alerts
            alerts_deleted = session.query(Aviso).filter_by(controlador_id=controlador_id).delete(synchronize_session='fetch')
            logger.info(f"Deleted {alerts_deleted} alerts")

            # Get all signal IDs that aren't referenced in aviso_logs
            safe_signal_ids = session.query(Signal.id).outerjoin(
                AvisoLog, Signal.id == AvisoLog.signal_id
            ).filter(
                Signal.controlador_id == controlador_id,
                AvisoLog.id.is_(None)
            ).all()
            
            safe_signal_ids = [id[0] for id in safe_signal_ids]

            # Delete signals that aren't referenced
            if safe_signal_ids:
                signals_deleted = session.query(Signal).filter(Signal.id.in_(safe_signal_ids)).delete(synchronize_session='fetch')
                logger.info(f"Deleted {signals_deleted} unreferenced signals")

            # Delete the controller
            controlador = session.query(Controlador).get(controlador_id)
            if not controlador:
                return {'message': 'Controller not found'}, 404

            session.delete(controlador)
            session.commit()
            logger.info(f"Successfully deleted controller {controlador_id}")

            return {
                'message': 'Controller and related data deleted successfully',
                'details': {
                    'alerts_deleted': alerts_deleted,
                    'alert_logs_deleted': alert_logs_deleted if alert_ids else 0,
                    'signals_deleted': signals_deleted if safe_signal_ids else 0
                }
            }, 200

        except Exception as e:
            logger.error(f"Error deleting controller {controlador_id}: {str(e)}")
            session.rollback()
            return {
                'message': 'Error deleting controller',
                'error': str(e)
            }, 500
        finally:
            session.close()