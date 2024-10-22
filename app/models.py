from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.sql import func
import uuid

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

class BaseModel(db.Model):
    __abstract__ = True
    created_at = db.Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = db.Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class Empresa(BaseModel):
    __tablename__ = 'empresas'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(255), unique=True, nullable=False)
    controladores = db.relationship('Controlador', back_populates='empresa', cascade='all, delete-orphan')

class Controlador(BaseModel):
    __tablename__ = 'controladores'
    id = db.Column(db.String(15), primary_key=True)  # Phone number as ID
    name = db.Column(db.String(255), nullable=False)
    empresa_id = db.Column(db.String(36), db.ForeignKey('empresas.id'), nullable=False)
    empresa = db.relationship('Empresa', back_populates='controladores')
    señales = db.relationship('Signal', back_populates='controlador', cascade='all, delete-orphan')
    config = db.Column(JSONB)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'empresa_id': self.empresa_id,
            'config': self.config,
            # Add any other fields you want to include
        }

class Signal(BaseModel):
    __tablename__ = 'signals'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    controlador_id = db.Column(db.String(15), db.ForeignKey('controladores.id'), nullable=False)
    tstamp = db.Column(TIMESTAMP(timezone=True), server_default=func.now())
    controlador = db.relationship('Controlador', back_populates='señales')
    value_sensor1 = db.Column(db.Boolean)
    value_sensor2 = db.Column(db.Boolean)
    value_sensor3 = db.Column(db.Boolean)
    value_sensor4 = db.Column(db.Boolean)
    value_sensor5 = db.Column(db.Boolean)
    value_sensor6 = db.Column(db.Boolean)

    def to_dict(self):
        return {
            'id': self.id,
            'controlador_id': self.controlador_id,
            'tstamp': self.tstamp.isoformat() if self.tstamp else None,
            'value_sensor1': self.value_sensor1,
            'value_sensor2': self.value_sensor2,
            'value_sensor3': self.value_sensor3,
            'value_sensor4': self.value_sensor4,
            'value_sensor5': self.value_sensor5,
            'value_sensor6': self.value_sensor6
        }

class User(BaseModel):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    username = db.Column(db.String(80), unique=True, nullable=False)
    first_name = db.Column(db.String(150))
    surname = db.Column(db.String(150))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(500), nullable=False)
    empresa_id = db.Column(db.String(36), db.ForeignKey('empresas.id'), nullable=False)
    permisos = db.Column(JSONB)

class Aviso(BaseModel):
    __tablename__ = 'avisos'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    controlador_id = db.Column(db.String(15), db.ForeignKey('controladores.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = db.Column(TIMESTAMP(timezone=True), onupdate=func.now())
    config = db.Column(JSONB, nullable=False)
    # Add relationship to controller
    controlador = db.relationship('Controlador', backref=db.backref('avisos', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'controlador_id': self.controlador_id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'config': self.config
        }

class AvisoLog(BaseModel):
    __tablename__ = 'aviso_logs'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    aviso_id = db.Column(db.String(36), db.ForeignKey('avisos.id'), nullable=False)
    triggered_at = db.Column(TIMESTAMP(timezone=True), server_default=func.now())
    sensor_name = db.Column(db.String(255), nullable=False)
    old_value = db.Column(db.Boolean)
    new_value = db.Column(db.Boolean)
    signal_id = db.Column(db.Integer, db.ForeignKey('signals.id'))
    
    # Add relationships
    aviso = db.relationship('Aviso')
    signal = db.relationship('Signal')

    def to_dict(self):
        return {
            'id': self.id,
            'aviso_id': self.aviso_id,
            'triggered_at': self.triggered_at.isoformat() if self.triggered_at else None,
            'sensor_name': self.sensor_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'signal_id': self.signal_id
        }

class SensorMetrics(BaseModel):
    __tablename__ = 'sensor_metrics'
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    controlador_id = db.Column(db.String(15), db.ForeignKey('controladores.id'), nullable=False)
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