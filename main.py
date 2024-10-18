import eventlet
eventlet.monkey_patch()

from flask_app import create_app, socketio
from flask_cors import CORS
from flask_app.logging_config import setup_logging
from flask_app.maintenance_scripts.db_maintenance import kill_idle_connections
from apscheduler.schedulers.background import BackgroundScheduler
import sys

# Create the app
app = create_app('testing')  # or whichever configuration you want to use

if app is None:
    print("Error: Application could not be created.")
    sys.exit(1)

# Set up logging
setup_logging(app)

CORS(app, resources={r"/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "OPTIONS"]}}, supports_credentials=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Set up scheduler for maintenance tasks
scheduler = BackgroundScheduler()
scheduler.add_job(func=kill_idle_connections, trigger="interval", minutes=30)
scheduler.start()

if __name__ == '__main__':
    socketio.run(app, debug=True)