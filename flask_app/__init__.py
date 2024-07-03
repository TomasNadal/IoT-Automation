import os
from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
#from flask_jwt_extended import JWTManager
from .models import db


def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])




    return app