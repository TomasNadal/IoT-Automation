# main.py (Modified to explicitly create apps)

import os
from flask import Flask, request
from app import create_app, socketio
from app.extensions import db
from app.logging_config import setup_logging
from app.maintenance_scripts.db_maintenance import kill_idle_connections
import sys

def create_and_configure_app(config_name):
    app = create_app(config_name)
    if app is None:
        print(f"Error: Application could not be created with config: {config_name}")
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


# Add a test route
@session_app.route('/test')
def test_route():
    return "Session app is running!"

# Add webhook route to session app
@session_app.route('/webhook/update', methods=['POST'])
def webhook_update():
    data = request.json
    socketio.emit('update_controladores', data, namespace='/')
    return '', 204

# Function to run the session app
def run_session_app():
    socketio.run(session_app, debug=False, port=5000, host='0.0.0.0')

# Function to run the transaction app
def run_transaction_app():
    transaction_app.run(debug=False, port=5001, host='0.0.0.0')

if __name__ == '__main__':
    run_session_app()