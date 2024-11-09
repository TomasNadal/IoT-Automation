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
    app= create_app(config_name)
    if app is None:
        logger.error(f"Error: Application could not be created with config: {config_name}")
        return None


    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
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

# Function to run the session app
def run_session_app(port,host,debug):
    logger.info("Starting session app on port 5000")
    socketio.run(session_app, debug=debug, port=port, host=host)



if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    # Determinar host basado en entorno
    if os.getenv('FLASK_ENV') == 'production':
        host = '0.0.0.0'
        debug = False
    else:
        host = '127.0.0.1'
        debug = True

    print(port,host,debug)
    run_session_app(port, host,debug)

