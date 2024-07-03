from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TIMESTAMP
import random

db = SQLAlchemy()

def get_id():
    min_bigint = 0
    max_bigint = 9223372036854775807
    id = random.randint(min_bigint, max_bigint)
    return id

class Empresa(db.Model):
    __tablename__ = 'empresa'
    id = db.Column(db.BigInteger, primary_key=True, nullable=False, default = get_id)
    name = db.Column(db.Text, unique=True, nullable=False)
    # Assuming one-to-many relationship with Controlador
    controladores = db.relationship('Controlador', backref='empresa', lazy=True)

class Controlador(db.Model):
    __tablename__ = 'controlador'
    id = db.Column(db.BigInteger, primary_key=True, nullable=False)
    name = db.Column(db.Text, unique=True, nullable=False)
    id_empresa = db.Column(db.BigInteger, db.ForeignKey('empresa.id'), nullable=False)
    # Assuming one-to-many relationship with Señal
    señales = db.relationship('Signal', backref='controlador', lazy=True)
    config = db.Column(JSONB)
    
    
class Signal(db.Model):
    __tablename__ = 'signal'
    id = db.Column(db.BigInteger, db.ForeignKey('controlador.id'), primary_key=True)
    tstamp = db.Column(TIMESTAMP, primary_key=True)
    value_sensor1 = db.Column(db.Boolean)
    value_sensor2 = db.Column(db.Boolean)
    value_sensor3 = db.Column(db.Boolean)
    value_sensor4 = db.Column(db.Boolean)
    value_sensor5 = db.Column(db.Boolean)
    value_sensor6 = db.Column(db.Boolean)


    __table_args__ = (
        db.PrimaryKeyConstraint('id', 'tstamp'),
        {},
    )


class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.BigInteger, primary_key=True, default = get_id)
    first_name = db.Column(db.String(150))
    surname = db.Column(db.String(150))
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(500), nullable=False)  # Make sure to reflect the change to 500 characters
    permisos = db.Column(db.String(50))
    empresa_id = db.Column(db.BigInteger, db.ForeignKey('empresa.id'))

    # UserMixin provides default implementations for these properties/methods
    # If you need to provide your own logic for any of these, you can override them here
    # For example:
    @property
    def is_active(self):
        # Assuming all users are active by default
        # You can add logic here to check if a user is banned or deactivated
        return True
    

class Aviso(db.Model):
    __tablename__ = 'avisos'
    id = db.Column(db.BigInteger, primary_key=True)
    id_controlador = db.Column(db.BigInteger, db.ForeignKey('controlador.id'), nullable=False)
    config = db.Column(JSONB, nullable=False)

    def __repr__(self):
        return f'<Aviso {self.id} para controlador {self.id_controlador}>'


class SensorMetrics(db.Model):
    __tablename__ = 'sensor_metrics'
    id = db.Column(db.BigInteger, primary_key=True, default=get_id)
    controlador_id = db.Column(db.BigInteger, db.ForeignKey('controlador.id'), nullable=False)
    connected_time_minutes = db.Column(db.Integer, default=0)  # Total connected time in minutes
    time_value_sensor1 = db.Column(db.Integer, default=0)  # Operating time for sensor 1 in minutes
    time_value_sensor2 = db.Column(db.Integer, default=0)  # Operating time for sensor 2 in minutes
    time_value_sensor3 = db.Column(db.Integer, default=0)  # Operating time for sensor 3 in minutes
    time_value_sensor4 = db.Column(db.Integer, default=0)  # Operating time for sensor 4 in minutes
    time_value_sensor5 = db.Column(db.Integer, default=0)  # Operating time for sensor 5 in minutes
    time_value_sensor6 = db.Column(db.Integer, default=0)  # Operating time for sensor 6 in minutes

    def __repr__(self):
        return f'<SensorMetrics for Controlador {self.controlador_id}>'