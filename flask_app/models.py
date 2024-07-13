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
    __table_args__ = {'schema': 'public'}
    id = db.Column(db.BigInteger, primary_key=True, nullable=False, default=get_id)
    name = db.Column(db.Text, unique=True, nullable=False)
    controladores = db.relationship('Controlador', backref='empresa', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'controladores': [controlador.to_dict() for controlador in self.controladores]
        }

class Controlador(db.Model):
    __tablename__ = 'controlador'
    __table_args__ = {'schema': 'public'}
    id = db.Column(db.BigInteger, primary_key=True, nullable=False, default=get_id)
    name = db.Column(db.Text, unique=True, nullable=False)
    id_empresa = db.Column(db.BigInteger, db.ForeignKey('public.empresa.id'), nullable=False)
    señales = db.relationship('Signal', backref='controlador', lazy=True)
    config = db.Column(JSONB)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'id_empresa': self.id_empresa,
            'señales': [señal.to_dict() for señal in self.señales],
            'config': self.config
        }

class Signal(db.Model):
    __tablename__ = 'signal'
    __table_args__ = {'schema': 'public'}
    id = db.Column(db.BigInteger, db.ForeignKey('public.controlador.id'), primary_key=True)
    tstamp = db.Column(TIMESTAMP, primary_key=True)
    value_sensor1 = db.Column(db.Boolean)
    value_sensor2 = db.Column(db.Boolean)
    value_sensor3 = db.Column(db.Boolean)
    value_sensor4 = db.Column(db.Boolean)
    value_sensor5 = db.Column(db.Boolean)
    value_sensor6 = db.Column(db.Boolean)

    __table_args__ = (
        db.PrimaryKeyConstraint('id', 'tstamp', name='signal_pk'),
        {'schema': 'public'},
    )

    def to_dict(self):
        return {
            'id': self.id,
            'tstamp': self.tstamp,
            'value_sensor1': self.value_sensor1,
            'value_sensor2': self.value_sensor2,
            'value_sensor3': self.value_sensor3,
            'value_sensor4': self.value_sensor4,
            'value_sensor5': self.value_sensor5,
            'value_sensor6': self.value_sensor6
        }

class User(db.Model, UserMixin):
    __tablename__ = 'user'
    __table_args__ = {'schema': 'public'}
    id = db.Column(db.BigInteger, primary_key=True, default=get_id)
    first_name = db.Column(db.String(150))
    surname = db.Column(db.String(150))
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(500), nullable=False)
    permisos = db.Column(db.String(50))
    empresa_id = db.Column(db.BigInteger, db.ForeignKey('public.empresa.id'))

    @property
    def is_active(self):
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'surname': self.surname,
            'email': self.email,
            'permisos': self.permisos,
            'empresa_id': self.empresa_id
        }

class Aviso(db.Model):
    __tablename__ = 'avisos'
    __table_args__ = {'schema': 'public'}
    id = db.Column(db.BigInteger, primary_key=True)
    id_controlador = db.Column(db.BigInteger, db.ForeignKey('public.controlador.id'), nullable=False)
    config = db.Column(JSONB, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'id_controlador': self.id_controlador,
            'config': self.config
        }

    def __repr__(self):
        return f'<Aviso {self.id} para controlador {self.id_controlador}>'

class SensorMetrics(db.Model):
    __tablename__ = 'sensor_metrics'
    __table_args__ = {'schema': 'public'}
    id = db.Column(db.BigInteger, primary_key=True, default=get_id)
    controlador_id = db.Column(db.BigInteger, db.ForeignKey('public.controlador.id'), nullable=False)
    connected_time_minutes = db.Column(db.Integer, default=0)
    time_value_sensor1 = db.Column(db.Integer, default=0)
    time_value_sensor2 = db.Column(db.Integer, default=0)
    time_value_sensor3 = db.Column(db.Integer, default=0)
    time_value_sensor4 = db.Column(db.Integer, default=0)
    time_value_sensor5 = db.Column(db.Integer, default=0)
    time_value_sensor6 = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'controlador_id': self.controlador_id,
            'connected_time_minutes': self.connected_time_minutes,
            'time_value_sensor1': self.time_value_sensor1,
            'time_value_sensor2': self.time_value_sensor2,
            'time_value_sensor3': self.time_value_sensor3,
            'time_value_sensor4': self.time_value_sensor4,
            'time_value_sensor5': self.time_value_sensor5,
            'time_value_sensor6': self.time_value_sensor6
        }

    def __repr__(self):
        return f'<SensorMetrics for Controlador {self.controlador_id}>'
