# populate_db.py

from app import create_app
from app.models import Empresa, Controlador, Signal
from datetime import datetime, timedelta, timezone
import random
import string
import json

def generate_unique_phone(session):
    while True:
        phone = "+34" + ''.join(random.choices(string.digits, k=9))
        if not session.query(Controlador).filter_by(id=phone).first():
            return phone

def get_base_config():
    return {
        "value_sensor1": {"name": "Lleno", "email": True, "tipo": "NA"},
        "value_sensor2": {"name": "Aceite", "email": False, "tipo": "NA"},
        "value_sensor3": {"name": "Magnetotérmico", "email": False, "tipo": "NA"},
        "value_sensor4": {"name": "Marcha", "email": False, "tipo": "NC"},
        "value_sensor5": {"name": "Listo", "email": False, "tipo": "NA"},
        "value_sensor6": {"name": "Temperatura", "email": False, "tipo": "NC"}
    }

def generate_cycle_signals(controlador_id, cycle_start):
    """Genera señales para un ciclo completo de procesamiento"""
    signals = []
    current_time = cycle_start
    
    # Estado inicial: todos los sensores apagados
    base_state = {
        "value_sensor1": False,  # Lleno
        "value_sensor2": False,  # Aceite
        "value_sensor3": False,  # Magnetotérmico
        "value_sensor4": True,   # Marcha (NC)
        "value_sensor5": False,  # Listo
        "value_sensor6": True    # Temperatura (NC)
    }

    # 1. Máquina lista para empezar
    signals.append(Signal(
        controlador_id=controlador_id,
        tstamp=current_time,
        value_sensor1=False,
        value_sensor2=False,
        value_sensor3=False,
        value_sensor4=True,
        value_sensor5=True,  # Listo se activa
        value_sensor6=True
    ))

    # 2. Inicio del ciclo
    current_time += timedelta(minutes=random.randint(2, 5))
    signals.append(Signal(
        controlador_id=controlador_id,
        tstamp=current_time,
        value_sensor1=False,
        value_sensor2=False,
        value_sensor3=False,
        value_sensor4=False,  # Marcha se activa (NC -> False significa activo)
        value_sensor5=True,
        value_sensor6=True
    ))

    # 3. Señales durante el proceso
    cycle_duration = timedelta(hours=random.uniform(6.5, 8.5))
    process_end = current_time + cycle_duration
    
    while current_time < process_end:
        current_time += timedelta(minutes=5)
        
        # Posibilidad de eventos aleatorios
        temp_warning = random.random() < 0.02  # 2% de probabilidad
        oil_warning = random.random() < 0.01   # 1% de probabilidad
        
        signals.append(Signal(
            controlador_id=controlador_id,
            tstamp=current_time,
            value_sensor1=False,
            value_sensor2=oil_warning,
            value_sensor3=False,
            value_sensor4=False,  # Marcha activa
            value_sensor5=True,   # Listo activo
            value_sensor6=not temp_warning  # Temperatura (NC)
        ))

    # 4. Fin del ciclo - Lleno
    current_time = process_end
    signals.append(Signal(
        controlador_id=controlador_id,
        tstamp=current_time,
        value_sensor1=True,   # Lleno
        value_sensor2=False,
        value_sensor3=False,
        value_sensor4=True,   # Marcha se detiene
        value_sensor5=False,  # Ya no está listo
        value_sensor6=True
    ))

    return signals

def populate_db():
    app = create_app('production_transaction')
    
    with app.app_context():
        session = app.db_factory()

        try:
            # Create empresas
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
                new_controladores = []
                for i in range(2 - existing_controladores):
                    phone = generate_unique_phone(session)
                    controlador = Controlador(
                        id=phone,
                        name=f"Controlador {existing_controladores + i + 1} de {empresa.name}",
                        empresa_id=empresa.id,
                        config=get_base_config()
                    )
                    session.add(controlador)
                    new_controladores.append(controlador)
                    print(f"Created new controlador: {controlador.name} with phone {phone}")
                session.commit()

            # Create realistic signals for the past week
            controladores = session.query(Controlador).all()
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=7)

            for controlador in controladores:
                print(f"\nGenerating signals for controlador: {controlador.name}")
                current_time = start_date
                signals_count = 0

                while current_time < end_date:
                    # Generate one complete cycle
                    cycle_signals = generate_cycle_signals(controlador.id, current_time)
                    
                    for signal in cycle_signals:
                        session.add(signal)
                        signals_count += 1
                        
                        # Commit every 100 signals to manage memory
                        if signals_count % 100 == 0:
                            session.commit()
                            print(f"Committed {signals_count} signals for {controlador.name}")
                    
                    # Move to next cycle start time
                    last_signal_time = cycle_signals[-1].tstamp
                    
                    # Add random maintenance break (5% chance)
                    if random.random() < 0.05:
                        current_time = last_signal_time + timedelta(hours=random.randint(2, 4))
                    else:
                        current_time = last_signal_time + timedelta(minutes=random.randint(30, 60))

                session.commit()
                print(f"Generated {signals_count} total signals for {controlador.name}")

            print("\nDatabase population completed successfully!")

        except Exception as e:
            session.rollback()
            print(f"An error occurred: {str(e)}")
            raise
        finally:
            session.close()

if __name__ == "__main__":
    populate_db()