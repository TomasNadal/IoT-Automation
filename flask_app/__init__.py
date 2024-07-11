import os
from dotenv import load_dotenv
from flask import Flask
from .models import db
from .config import config

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions with the app instance
    db.init_app(app)

    # Register the teardown function
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()

    # Import blueprints and models after initializing extensions
    from .api.arduino import arduino

    # Register blueprints
    app.register_blueprint(arduino, url_prefix='/api')
      
    return app
