import eventlet
eventlet.monkey_patch()

import os
from flask import Flask
from app import create_app, socketio
import logging
import sys

# Mejorar el logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    stream=sys.stdout  # Asegura que los logs van a stdout
)
logger = logging.getLogger(__name__)

def create_and_configure_app(config_name):
    logger.info(f"Creating app with config: {config_name}")
    try:
        app = create_app(config_name)
        if app is None:
            logger.error(f"Error: Application could not be created with config: {config_name}")
            return None

        @app.after_request
        def after_request(response):
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
            response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response

        logger.info("Application created successfully")
        return app
    except Exception as e:
        logger.error(f"Error creating app: {str(e)}", exc_info=True)
        return None

# Determine environment
env_prefix = 'production' if os.getenv('FLASK_ENV') == 'production' else 'development'
logger.info(f"Environment prefix: {env_prefix}")

# Create session app
session_app = create_and_configure_app(f'{env_prefix}_session')

if session_app is None:
    logger.error("Failed to create session app")
    sys.exit(1)

# Add a test route to session app
@session_app.route('/test')
def test_route():
    logger.info("Test route accessed")
    return "Session app is running!"

@session_app.route('/')
def home():
    logger.info("Home route accessed")
    return "IoT Backend is running!"

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    if os.getenv('FLASK_ENV') == 'production':
        host = '0.0.0.0'
        debug = False
    else:
        host = '127.0.0.1'
        debug = True

    logger.info(f"Starting app on {host}:{port} with debug={debug}")
    
    try:
        socketio.run(
            session_app,
            host=host,
            port=port,
            debug=debug,
            log_output=True,  # Habilita logging de socketio
            use_reloader=False  # Deshabilita el reloader en producción
        )
    except Exception as e:
        logger.error(f"Error running app: {str(e)}", exc_info=True)
        sys.exit(1)