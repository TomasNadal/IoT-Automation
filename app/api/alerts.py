from flask import Blueprint, request, jsonify, current_app
from ..models import Aviso, AvisoLog, Controlador
from ..extensions import db, socketio
import logging
from datetime import datetime
from sqlalchemy import desc

alerts_bp = Blueprint('alerts', __name__)
logger = logging.getLogger(__name__)

@alerts_bp.route('/controlador/<controlador_id>/alerts', methods=['GET', 'POST'])
def handle_alerts(controlador_id):
    session = current_app.db_factory()
    try:
        if request.method == 'GET':
            # Get all alerts for a controller
            alerts = session.query(Aviso).\
                filter_by(controlador_id=controlador_id).\
                order_by(desc(Aviso.created_at)).\
                all()
            
            return jsonify({
                'alerts': [alert.to_dict() for alert in alerts]
            })

        elif request.method == 'POST':
            # Create new alert
            data = request.json
            
            # Validate controller exists
            controlador = session.query(Controlador).get(controlador_id)
            if not controlador:
                return jsonify({'error': 'Controller not found'}), 404

            # Validate sensor exists in controller config
            sensor_name = data['config'].get('sensor_name')
            sensor_found = False
            for sensor_config in controlador.config.values():
                if sensor_config.get('name') == sensor_name:
                    sensor_found = True
                    break
            
            if not sensor_found:
                return jsonify({'error': f'Sensor {sensor_name} not found in controller configuration'}), 400

            # Create alert
            new_alert = Aviso(
                controlador_id=controlador_id,
                name=data['name'],
                description=data.get('description', ''),
                config=data['config'],
                is_active=data.get('is_active', True)
            )
            
            session.add(new_alert)
            session.commit()

            # Emit socket event for new alert creation
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

@alerts_bp.route('/<alert_id>', methods=['PUT', 'DELETE'])
def handle_alert(alert_id):
    session = current_app.db_factory()
    try:
        alert = session.query(Aviso).get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404

        if request.method == 'PUT':
            data = request.json
            alert.name = data.get('name', alert.name)
            alert.description = data.get('description', alert.description)
            alert.is_active = data.get('is_active', alert.is_active)
            alert.config = data.get('config', alert.config)
            alert.updated_at = datetime.utcnow()
            
            session.commit()

            # Emit socket event for alert update
            socketio.emit('alert_updated', {
                'controlador_id': alert.controlador_id,
                'alert': alert.to_dict()
            })

            return jsonify(alert.to_dict())

        elif request.method == 'DELETE':
            session.delete(alert)
            session.commit()

            # Emit socket event for alert deletion
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

@alerts_bp.route('/controlador/<controlador_id>/alert-logs', methods=['GET'])
def get_alert_logs(controlador_id):
    session = current_app.db_factory()
    try:
        # Get optional query parameters
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Get logs for all alerts of this controller
        logs = session.query(AvisoLog).\
            join(Aviso).\
            filter(Aviso.controlador_id == controlador_id).\
            order_by(desc(AvisoLog.triggered_at)).\
            offset(offset).\
            limit(limit).\
            all()

        return jsonify({
            'logs': [log.to_dict() for log in logs],
            'count': len(logs)
        })

    except Exception as e:
        logger.error(f"Error getting alert logs: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()