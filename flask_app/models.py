from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.sql import func
import uuid

db = SQLAlchemy()

class BaseModel(db.Model):
    __abstract__ = True
    created_at = db.Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = db.Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

def generate_uuid():
    return str(uuid.uuid4())

class Empresa(BaseModel):
    __tablename__ = 'empresas'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), unique=True, nullable=False)
    controladores = db.relationship('Controlador', back_populates='empresa', cascade='all, delete-orphan')

class Controlador(BaseModel):
    __tablename__ = 'controladores'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), nullable=False)
    empresa_id = db.Column(db.String(36), db.ForeignKey('empresas.id'), nullable=False)
    empresa = db.relationship('Empresa', back_populates='controladores')
    señales = db.relationship('Signal', back_populates='controlador', cascade='all, delete-orphan')
    config = db.Column(JSONB)

class Signal(BaseModel):
    __tablename__ = 'signals'
    id = db.Column(db.String(36), db.ForeignKey('controladores.id'), primary_key=True)
    tstamp = db.Column(TIMESTAMP(timezone=True), primary_key=True, server_default=func.now())
    controlador = db.relationship('Controlador', back_populates='señales')
    value_sensor1 = db.Column(db.Boolean)
    value_sensor2 = db.Column(db.Boolean)
    value_sensor3 = db.Column(db.Boolean)
    value_sensor4 = db.Column(db.Boolean)
    value_sensor5 = db.Column(db.Boolean)
    value_sensor6 = db.Column(db.Boolean)

class User(BaseModel, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    username = db.Column(db.String(80), unique=True, nullable=False)
    first_name = db.Column(db.String(150))
    surname = db.Column(db.String(150))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(500), nullable=False)
    empresa_id = db.Column(db.String(36), db.ForeignKey('empresas.id'), nullable=False)
    permisos = db.Column(JSONB)

    @property
    def is_active(self):
        return True

class Aviso(BaseModel):
    __tablename__ = 'avisos'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    controlador_id = db.Column(db.String(36), db.ForeignKey('controladores.id'), nullable=False)
    config = db.Column(JSONB, nullable=False)

class SensorMetrics(BaseModel):
    __tablename__ = 'sensor_metrics'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    controlador_id = db.Column(db.String(36), db.ForeignKey('controladores.id'), nullable=False)
    connected_time_minutes = db.Column(db.Integer, default=0)
    time_value_sensor1 = db.Column(db.Integer, default=0)
    time_value_sensor2 = db.Column(db.Integer, default=0)
    time_value_sensor3 = db.Column(db.Integer, default=0)
    time_value_sensor4 = db.Column(db.Integer, default=0)
    time_value_sensor5 = db.Column(db.Integer, default=0)
    time_value_sensor6 = db.Column(db.Integer, default=0)

class DatabaseConnectionLog(BaseModel):
    __tablename__ = 'database_connection_logs'
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    timestamp = db.Column(TIMESTAMP(timezone=True), server_default=func.now())
    process_id = db.Column(db.Integer)
    application_name = db.Column(db.String(255))
    database_name = db.Column(db.String(255))
    user_name = db.Column(db.String(255))
    client_addr = db.Column(db.String(255))
    backend_start = db.Column(TIMESTAMP(timezone=True))
    query = db.Column(db.Text)
    state = db.Column(db.String(50))
    function_name = db.Column(db.String(255))
    file_name = db.Column(db.String(255))
    line_number = db.Column(db.Integer)