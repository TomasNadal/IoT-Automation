from flask import Blueprint, request, jsonify
from app import socketio
import logging

webhook_bp = Blueprint('webhook', __name__)
logger = logging.getLogger(__name__)

@webhook_bp.route('/update', methods=['POST'])
def webhook_update():
    try:
        data = request.json
        logger.info(f"Received webhook data: {data}")
        
        if not data:
            logger.error("Webhook received empty data")
            return jsonify({"error": "No data provided"}), 400

        controlador_id = data.get('controlador_id')
        new_signal = data.get('new_signal')

        if not controlador_id or not new_signal:
            logger.error(f"Webhook received invalid data: {data}")
            return jsonify({"error": "Invalid data format"}), 400

        logger.info(f"Attempting to emit 'update_controladores' event for controlador {controlador_id}")
        socketio.emit('update_controladores', data, namespace='/')
        logger.info(f"Emission attempt completed for controlador {controlador_id}")

        # Get connected clients
        clients = socketio.server.eio.sockets
        logger.info(f"Current connected clients: {len(clients)}")

        return jsonify({"message": "Update received and broadcasted"}), 200
    except Exception as e:
        logger.exception(f"Error in webhook_update: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500