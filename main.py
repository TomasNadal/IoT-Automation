import eventlet
eventlet.monkey_patch()

import os
from flask import Flask
from app import create_app, socketio
from app.logging_config import setup_logging
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

    setup_logging(app)

    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    return app

# Create session app
session_app = create_and_configure_app('production_session')

# Create transaction app
transaction_app = create_and_configure_app('production_transaction')

if session_app is None or transaction_app is None:
    sys.exit(1)

# Add a test route to session app
@session_app.route('/test')
def test_route():
    logger.info("Test route accessed")
    return "Session app is running!"

# Function to run the session app
def run_session_app():
    logger.info("Starting session app on port 5000")
    socketio.run(session_app, debug=True, port=5000, host='0.0.0.0')

# Function to run the transaction app
def run_transaction_app():
    logger.info("Starting transaction app on port 5001")
    transaction_app.run(debug=False, port=5001, host='0.0.0.0')

if __name__ == '__main__':
    run_session_app()