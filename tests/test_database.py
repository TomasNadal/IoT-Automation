import unittest
from flask import current_app
from flask_app import create_app, db
from flask_app.models import Empresa, Controlador, Signal
import datetime

class DatabaseTestCase(unittest.TestCase):
    def setUp(self):
        # Create a new test client and push a new application context
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()

        # Create all tables
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_create_empresa_and_controlador(self):
        # Test creation of Empresa and Controlador
        empresa = Empresa(name="EmpresaTest")
        db.session.add(empresa)
        db.session.commit()

        controlador = Controlador(name="ControladorTest", id_empresa=empresa.id)
        db.session.add(controlador)
        db.session.commit()

        retrieved_empresa = Empresa.query.filter_by(name="EmpresaTest").first()
        self.assertIsNotNone(retrieved_empresa)
        self.assertEqual(retrieved_empresa.name, "EmpresaTest")

        retrieved_controlador = Controlador.query.filter_by(name="ControladorTest").first()
        self.assertIsNotNone(retrieved_controlador)
        self.assertEqual(retrieved_controlador.name, "ControladorTest")
        self.assertEqual(retrieved_controlador.empresa.id, retrieved_empresa.id)

    def test_create_signal(self):
        # Create a Controlador to link with the Signal
        empresa = Empresa(name="EmpresaTest")
        db.session.add(empresa)
        db.session.commit()

        controlador = Controlador(name="ControladorTest", id_empresa=empresa.id)
        db.session.add(controlador)
        db.session.commit()

        # Test creation of Signal
        signal = Signal(id=controlador.id, tstamp=datetime.datetime.now(), value_sensor1=True)
        db.session.add(signal)
        db.session.commit()

        retrieved_signal = Signal.query.filter_by(id=controlador.id).first()
        self.assertIsNotNone(retrieved_signal)
        self.assertEqual(retrieved_signal.id, controlador.id)
        self.assertTrue(retrieved_signal.value_sensor1)

if __name__ == '__main__':
    unittest.main()
