import eventlet
eventlet.monkey_patch()

import os
from flask import Flask
from app import create_app, socketio
import logging
import sys

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_and_configure_app(config_name):
    app = create_app(config_name)
    if app is None:
        logger.error(f"Error: Application could not be created with config: {config_name}")
        return None

    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    return app

# Determine environment
env_prefix = 'production' if os.getenv('FLASK_ENV') == 'production' else 'development'

# Create session app
session_app = create_and_configure_app(f'{env_prefix}_session')

if session_app is None:
    sys.exit(1)

# Add a test route to session app
@session_app.route('/test')
def test_route():
    logger.info("Test route accessed")
    return "Session app is running!"

@session_app.route('/')
def home():
    return "IoT Automation Backend is running!"

def run_session_app(port, host, debug):
    logger.info(f"Starting session app on {host}:{port} with debug={debug}")
    socketio.run(
        session_app,
        host=host,
        port=port,
        debug=debug,
        use_reloader=not os.getenv('FLASK_ENV') == 'production',  # Solo usar reloader en desarrollo
        cors_allowed_origins="*",  # O configura esto desde variables de entorno
        allow_unsafe_werkzeug=True  # Necesario para Railway
    )

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    # Determinar configuración basada en entorno
    is_production = os.getenv('FLASK_ENV') == 'production'
    
    config = {
        'host': '0.0.0.0' if is_production else '127.0.0.1',
        'port': port,
        'debug': not is_production
    }

    logger.info(f"Starting application with config: {config}")
    
    try:
        run_session_app(**config)
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        sys.exit(1)