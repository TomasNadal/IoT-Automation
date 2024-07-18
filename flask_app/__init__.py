from flask import Flask
from flask_socketio import SocketIO
from .models import db
from .config import config

socketio = SocketIO(cors_allowed_origins="*")

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions with the app instance
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="http://localhost:5173")

    # Register the teardown function
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()

    # Import blueprints and models after initializing extensions
    from .api.arduino import arduino
    from .api.dashboard import dashboard

    # Register blueprints
    app.register_blueprint(arduino, url_prefix='/api')
    app.register_blueprint(dashboard, url_prefix='/dashboard')
    
    return app
