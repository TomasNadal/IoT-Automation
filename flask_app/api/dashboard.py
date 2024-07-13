
from flask import Blueprint, jsonify
from ..models import db, Empresa, Controlador, Signal
from sqlalchemy.sql import func
from sqlalchemy.orm import aliased
from sqlalchemy import select
from datetime import datetime, timedelta
import pytz


dashboard = Blueprint('dashboard', __name__)



@dashboard.route('/empresa/<int:empresa_id>/dashboard', methods=['GET'])
def get_dashboard_data(empresa_id):
    try:
        # Subquery to get the last 100 signals for each controlador
        subquery = (
            db.session.query(
                Signal.id,
                Signal.tstamp,
                Signal.value_sensor1,
                Signal.value_sensor2,
                Signal.value_sensor3,
                Signal.value_sensor4,
                Signal.value_sensor5,
                Signal.value_sensor6,
                func.row_number().over(
                    partition_by=Signal.id,
                    order_by=Signal.tstamp.desc()
                ).label('row_num')
            ).subquery()
        )

        # Main query to join controladores with their last 100 signals
        controladores_with_signals = (
            db.session.query(
                Controlador,
                subquery.c.tstamp,
                subquery.c.value_sensor1,
                subquery.c.value_sensor2,
                subquery.c.value_sensor3,
                subquery.c.value_sensor4,
                subquery.c.value_sensor5,
                subquery.c.value_sensor6
            ).outerjoin(
                subquery, subquery.c.id == Controlador.id
            ).filter(
                Controlador.id_empresa == empresa_id,
                subquery.c.row_num <= 100
            ).all()
        )

        # Process the results
        controladores_dict = {}
        for result in controladores_with_signals:
            controlador = result.Controlador
            signal_data = {
                'tstamp': result.tstamp,
                'value_sensor1': result.value_sensor1,
                'value_sensor2': result.value_sensor2,
                'value_sensor3': result.value_sensor3,
                'value_sensor4': result.value_sensor4,
                'value_sensor5': result.value_sensor5,
                'value_sensor6': result.value_sensor6,
            }

            if controlador.id not in controladores_dict:
                controladores_dict[controlador.id] = {
                    'controlador': controlador.to_dict(),
                    'signals': []
                }

            if signal_data['tstamp']:  # Avoid adding empty signal data
                controladores_dict[controlador.id]['signals'].append(signal_data)

        controladores_list = list(controladores_dict.values())

        return jsonify(controladores_list), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dashboard.route("/empresa/<int:id>/connected_stats", methods=["GET"])
def get_connected_stats(id):
    controladores = Controlador.query.filter_by(id_empresa=id).all()

    connected_count = sum(1 for controlador in controladores if is_controlador_connected(controlador))
    disconnected_count = len(controladores) - connected_count

    return jsonify({
        "connected": connected_count,
        "disconnected": disconnected_count
    }), 200

def is_controlador_connected(controlador):
    last_sample = Signal.query.filter_by(id=controlador.id).order_by(Signal.tstamp.desc()).first()
    if last_sample:
        return last_sample.tstamp > datetime.now(pytz.timezone('Europe/Paris')) - timedelta(minutes=5)
    return False