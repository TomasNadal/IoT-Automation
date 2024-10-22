from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from ..models import Aviso, AvisoLog, Signal, Controlador
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self, session: Session):
        self.session = session

    def create_alert(self, data: Dict[str, Any]) -> Aviso:
        """
        Create a new alert configuration
        Example config:
        {
            "name": "Oil Level Alert",
            "description": "Alert when oil level changes",
            "controlador_id": "controller123",
            "config": {
                "sensor_name": "Aceite",
                "conditions": [
                    {
                        "from_state": false,
                        "to_state": true,
                        "notify_web": true
                    }
                ]
            }
        }
        """
        alert = Aviso(
            controlador_id=data['controlador_id'],
            name=data['name'],
            description=data.get('description'),
            config=data['config']
        )
        self.session.add(alert)
        self.session.commit()
        return alert

    def check_alerts(self, controlador_id: str, new_signal: Signal, previous_signal: Optional[Signal]) -> List[AvisoLog]:
        """
        Check if any alerts should be triggered based on the new signal
        """
        if not previous_signal:
            return []

        # Get controller configuration to map sensor positions to names
        controlador = self.session.query(Controlador).get(controlador_id)
        if not controlador or not controlador.config:
            logger.error(f"Controller {controlador_id} not found or has no config")
            return []

        # Get active alerts for this controller
        alerts = self.session.query(Aviso).filter(
            Aviso.controlador_id == controlador_id,
            Aviso.is_active == True
        ).all()

        triggered_alerts = []

        for alert in alerts:
            sensor_name = alert.config.get('sensor_name')
            if not sensor_name:
                continue

            # Find the current sensor key (value_sensorX) for this sensor name
            sensor_key = None
            for key, config in controlador.config.items():
                if config.get('name') == sensor_name:
                    sensor_key = key
                    break

            if not sensor_key:
                logger.warning(f"Sensor {sensor_name} not found in controller config")
                continue

            # Get the old and new values
            old_value = getattr(previous_signal, sensor_key, None)
            new_value = getattr(new_signal, sensor_key, None)

            # Check if any condition is met
            for condition in alert.config.get('conditions', []):
                if (old_value == condition.get('from_state') and 
                    new_value == condition.get('to_state')):
                    
                    # Create alert log
                    alert_log = AvisoLog(
                        aviso_id=alert.id,
                        sensor_name=sensor_name,
                        old_value=old_value,
                        new_value=new_value,
                        signal_id=new_signal.id
                    )
                    self.session.add(alert_log)
                    triggered_alerts.append(alert_log)

        if triggered_alerts:
            self.session.commit()

        return triggered_alerts

    def get_alert_logs(self, controlador_id: str, limit: int = 100) -> List[AvisoLog]:
        """Get recent alert logs for a controller"""
        return self.session.query(AvisoLog).\
            join(Aviso).\
            filter(Aviso.controlador_id == controlador_id).\
            order_by(AvisoLog.triggered_at.desc()).\
            limit(limit).\
            all()