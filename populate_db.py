# populate_db.py

from app import create_app
from app.models import Empresa, Controlador, Signal
from datetime import datetime, timedelta, timezone
import random
import string

def generate_unique_phone(session):
    while True:
        phone = "+34" + ''.join(random.choices(string.digits, k=9))
        if not session.query(Controlador).filter_by(id=phone).first():
            return phone

def populate_db():
    app = create_app('production_transaction')
    
    with app.app_context():
        session = app.db_factory()

        try:
            # Check and create empresas
            empresa_names = ["Empresa A", "Empresa B", "Empresa C"]
            empresas = []
            for name in empresa_names:
                empresa = session.query(Empresa).filter_by(name=name).first()
                if not empresa:
                    empresa = Empresa(name=name)
                    session.add(empresa)
                    print(f"Created new empresa: {name}")
                else:
                    print(f"Empresa already exists: {name}")
                empresas.append(empresa)
            session.commit()

            # Create controladores
            for empresa in empresas:
                existing_controladores = session.query(Controlador).filter_by(empresa_id=empresa.id).count()
                for i in range(2 - existing_controladores):
                    phone = generate_unique_phone(session)
                    controlador = Controlador(
                        id=phone, 
                        name=f"Controlador {existing_controladores + i + 1} de {empresa.name}", 
                        empresa_id=empresa.id
                    )
                    session.add(controlador)
                    print(f"Created new controlador: {controlador.name} with phone {phone}")
            session.commit()

            # Create signals
            controladores = session.query(Controlador).all()
            now = datetime.now()
            for controlador in controladores:
                existing_signals = session.query(Signal).filter_by(controlador_id=controlador.id).count()
                signals = []
                for i in range(100 - existing_signals):  # Ensure 100 signals per controlador
                    signal = Signal(
                        controlador_id=controlador.id,
                        tstamp=now - timedelta(minutes=i*5),
                        value_sensor1=random.choice([True, False]),
                        value_sensor2=random.choice([True, False]),
                        value_sensor3=random.choice([True, False]),
                        value_sensor4=random.choice([True, False]),
                        value_sensor5=random.choice([True, False]),
                        value_sensor6=random.choice([True, False])
                    )
                    signals.append(signal)
                session.add_all(signals)
                print(f"Created {len(signals)} new signals for controlador {controlador.id}")
            session.commit()

            print("Database population completed successfully!")

        except Exception as e:
            session.rollback()
            print(f"An error occurred: {str(e)}")
        finally:
            session.close()

if __name__ == "__main__":
    populate_db()