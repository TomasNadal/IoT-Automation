from flask import Blueprint, request, jsonify, current_app
from ..models import Aviso, AvisoLog, Controlador, Signal
from ..extensions import db, socketio
from ..services.alert_service import AlertService
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import desc, and_, or_
from sqlalchemy.orm import joinedload
from typing import Optional

alerts_bp = Blueprint('alerts', __name__)

logger = logging.getLogger(__name__)


@alerts_bp.after_request
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

def validate_state(state: str) -> bool:
    """Validate that a state is either 'On' or 'Off'"""
    return state in ['On', 'Off']

def validate_alert_config(config: dict, controller_config: dict) -> tuple[bool, Optional[str]]:
    """
    Validate alert configuration
    Returns: (is_valid: bool, error_message: Optional[str])
    """
    if not config.get('sensor_name'):
        return False, "Sensor name is required"
    
    # Validate sensor exists and get its type
    sensor_found = False
    for sensor_config in controller_config.values():
        if sensor_config.get('name') == config['sensor_name']:
            sensor_found = True
            break
    
    if not sensor_found:
        return False, f"Sensor {config['sensor_name']} not found in controller configuration"

    # Validate conditions
    conditions = config.get('conditions', [])
    if not conditions:
        return False, "At least one condition is required"

    for condition in conditions:
        if not validate_state(condition.get('from_state', '')):
            return False, "Invalid from_state - must be 'On' or 'Off'"
        if not validate_state(condition.get('to_state', '')):
            return False, "Invalid to_state - must be 'On' or 'Off'"

    return True, None

@alerts_bp.route('/controlador/<controlador_id>/alerts', methods=['GET', 'POST'])
def handle_alerts(controlador_id):
    session = current_app.db_factory()
    try:
        if request.method == 'GET':
            alerts = session.query(Aviso).\
                filter_by(controlador_id=controlador_id).\
                order_by(desc(Aviso.created_at)).\
                all()
            
            return jsonify({
                'alerts': [alert.to_dict() for alert in alerts]
            })

        elif request.method == 'POST':
            data = request.json
            
            # Validate controller exists
            controlador = session.query(Controlador).get(controlador_id)
            if not controlador:
                return jsonify({'error': 'Controller not found'}), 404

            # Validate alert configuration
            is_valid, error_message = validate_alert_config(data['config'], controlador.config)
            if not is_valid:
                return jsonify({'error': error_message}), 400

            # Create new alert
            new_alert = Aviso(
                controlador_id=controlador_id,
                name=data['name'],
                description=data.get('description', ''),
                config=data['config'],
                is_active=data.get('is_active', True)
            )
            
            session.add(new_alert)
            session.commit()

            socketio.emit('alert_created', {
                'controlador_id': controlador_id,
                'alert': new_alert.to_dict()
            })

            return jsonify(new_alert.to_dict()), 201

    except Exception as e:
        logger.error(f"Error handling alerts: {str(e)}")
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@alerts_bp.route('/<alert_id>', methods=['PUT'])
def handle_alert(alert_id):
    session = current_app.db_factory()
    try:
        alert = session.query(Aviso).get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404

        if request.method == 'PUT':
            data = request.json
            
            # If config is being updated, validate it
            if 'config' in data:
                controlador = session.query(Controlador).get(alert.controlador_id)
                is_valid, error_message = validate_alert_config(data['config'], controlador.config)
                if not is_valid:
                    return jsonify({'error': error_message}), 400

            alert.name = data.get('name', alert.name)
            alert.description = data.get('description', alert.description)
            alert.is_active = data.get('is_active', alert.is_active)
            alert.config = data.get('config', alert.config)
            alert.updated_at = datetime.utcnow()
            
            session.commit()

            socketio.emit('alert_updated', {
                'controlador_id': alert.controlador_id,
                'alert': alert.to_dict()
            })

            return jsonify(alert.to_dict())

        elif request.method == 'DELETE':
            session.delete(alert)
            session.commit()

            socketio.emit('alert_deleted', {
                'controlador_id': alert.controlador_id,
                'alert_id': alert_id
            })

            return jsonify({'message': 'Alert deleted successfully'})

    except Exception as e:
        logger.error(f"Error handling alert {alert_id}: {str(e)}")
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@alerts_bp.route('/<alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    """Delete an alert and its associated logs"""
    session = current_app.db_factory()
    try:
        logger.info(f"Starting deletion process for alert {alert_id}")

        # First, delete all associated logs
        session.query(AvisoLog).filter_by(aviso_id=alert_id).delete(synchronize_session='fetch')
        logger.info(f"Deleted associated logs for alert {alert_id}")

        # Then delete the alert itself
        alert = session.query(Aviso).get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404

        controlador_id = alert.controlador_id  # Store this for the event emission
        
        session.delete(alert)
        session.commit()
        
        # Emit alert deleted event
        socketio.emit('alert_deleted', {
            'controlador_id': controlador_id,
            'alert_id': alert_id
        })

        logger.info(f"Successfully deleted alert {alert_id}")
        return jsonify({'message': 'Alert deleted successfully'})

    except Exception as e:
        logger.error(f"Error deleting alert {alert_id}: {str(e)}")
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@alerts_bp.route('/controlador/<controlador_id>/active-alerts', methods=['GET'])
def get_active_alerts(controlador_id):
    """Get currently active alerts for a controller"""
    session = current_app.db_factory()
    alert_service = AlertService(session)
    
    try:
        latest_signal = session.query(Signal).\
            filter_by(controlador_id=controlador_id).\
            order_by(desc(Signal.tstamp)).\
            first()

        if not latest_signal:
            return jsonify({
                'active_alerts': [],
                'count': 0
            })

        controlador = session.query(Controlador).get(controlador_id)
        alerts = session.query(Aviso).\
            filter_by(controlador_id=controlador_id, is_active=True).\
            all()

        active_alerts = []
        for alert in alerts:
            latest_log = session.query(AvisoLog).\
                filter_by(aviso_id=alert.id).\
                order_by(desc(AvisoLog.triggered_at)).\
                first()

            if latest_log and not latest_log.resolved:
                sensor_name = alert.config.get('sensor_name')
                sensor_key = None
                sensor_type = None
                
                # Find sensor configuration
                for key, config in controlador.config.items():
                    if config.get('name') == sensor_name:
                        sensor_key = key
                        sensor_type = config.get('tipo', 'NA')
                        break

                if sensor_key and sensor_type:
                    current_value = getattr(latest_signal, sensor_key, None)
                    # Convert physical state to logical state for the response
                    logical_state = alert_service.convert_physical_state_to_logical(
                        current_value, 
                        sensor_type
                    )
                    
                    active_alerts.append({
                        'alert': alert.to_dict(),
                        'latest_log': latest_log.to_dict(),
                        'current_state': logical_state
                    })

        return jsonify({
            'active_alerts': active_alerts,
            'count': len(active_alerts)
        })

    except Exception as e:
        logger.error(f"Error getting active alerts: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@alerts_bp.route('/controlador/<controlador_id>/alert-logs', methods=['GET'])
def get_alert_logs(controlador_id):
    session = current_app.db_factory()
    try:
        # Get optional query parameters
        limit = request.args.get('limit', 100, type=int)
        days = request.args.get('days', 7, type=int)
        
        # Calculate the date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)

        # Get logs with alert details
        logs = session.query(AvisoLog).\
            join(Aviso).\
            filter(
                Aviso.controlador_id == controlador_id,
                AvisoLog.triggered_at.between(start_date, end_date)
            ).\
            order_by(desc(AvisoLog.triggered_at)).\
            limit(limit).\
            all()

        # Convert logs to dictionary format
        processed_logs = []
        for log in logs:
            log_dict = log.to_dict()
            
            # Include alert name and description
            if log.aviso:
                log_dict['name'] = log.aviso.name
                log_dict['description'] = log.aviso.description

            processed_logs.append(log_dict)

        return jsonify({
            'logs': processed_logs,
            'count': len(processed_logs),
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting alert logs: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()