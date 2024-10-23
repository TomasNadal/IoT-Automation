from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import logging
from ..models import Aviso, AvisoLog, Signal, Controlador
from sqlalchemy.orm import Session
from sqlalchemy import desc

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self, session: Session):
        self.session = session

    def find_sensor_key_and_type(self, controlador_config: Dict[str, Any], sensor_name: str) -> Tuple[Optional[str], Optional[str]]:
        """Find the sensor key and type in the controller configuration"""
        if not controlador_config:
            logger.error("No controller configuration provided")
            return None, None

        for key, config in controlador_config.items():
            if config.get('name') == sensor_name:
                sensor_type = config.get('tipo', 'NA')
                logger.debug(f"Found sensor {sensor_name}: {key} ({sensor_type})")
                return key, sensor_type
        
        logger.warning(f"Sensor {sensor_name} not found in configuration")
        return None, None

    def convert_physical_to_logical_state(self, physical_value: bool, sensor_type: str) -> bool:
        """Convert physical sensor state to logical state based on sensor type"""
        if sensor_type not in ['NA', 'NC']:
            logger.warning(f"Invalid sensor type: {sensor_type}, defaulting to NA")
            sensor_type = 'NA'

        # For NA (Normally Open), physical True means On
        # For NC (Normally Closed), physical True means Off
        return physical_value if sensor_type == 'NA' else not physical_value

    def get_state_string(self, logical_value: bool) -> str:
        """Convert logical boolean state to string representation"""
        return 'On' if logical_value else 'Off'

    def check_alerts(self, controlador_id: str, new_signal: Signal, previous_signal: Optional[Signal]) -> Tuple[List[AvisoLog], List[AvisoLog]]:
        """Check for new alerts and resolutions"""
        if not previous_signal or not new_signal:
            logger.warning("Missing signal data for comparison")
            return [], []

        controlador = self.session.query(Controlador).get(controlador_id)
        if not controlador or not controlador.config:
            logger.error(f"Controller {controlador_id} not found or has no config")
            return [], []

        alerts = self.session.query(Aviso).filter_by(
            controlador_id=controlador_id,
            is_active=True
        ).all()

        new_alerts = []
        resolved_alerts = []

        for alert in alerts:
            try:
                self._process_alert(alert, controlador, new_signal, previous_signal, new_alerts, resolved_alerts)
            except Exception as e:
                logger.error(f"Error processing alert {alert.id}: {str(e)}")
                continue

        if new_alerts or resolved_alerts:
            try:
                self.session.commit()
                logger.info(f"Committed changes - New alerts: {len(new_alerts)}, Resolved: {len(resolved_alerts)}")
            except Exception as e:
                logger.error(f"Error committing alert changes: {str(e)}")
                self.session.rollback()
                return [], []

        return new_alerts, resolved_alerts

    def _process_alert(self, alert: Aviso, controlador: Controlador, new_signal: Signal, 
                      previous_signal: Signal, new_alerts: List[AvisoLog], resolved_alerts: List[AvisoLog]) -> None:
        """Process a single alert"""
        sensor_name = alert.config.get('sensor_name')
        if not sensor_name:
            logger.warning(f"Alert {alert.id} has no sensor_name configured")
            return

        sensor_key, sensor_type = self.find_sensor_key_and_type(controlador.config, sensor_name)
        if not sensor_key:
            return

        # Get physical values
        old_value = getattr(previous_signal, sensor_key, None)
        new_value = getattr(new_signal, sensor_key, None)
        if old_value is None or new_value is None:
            logger.warning(f"Missing sensor values for {sensor_key}")
            return

        # Convert to logical states
        old_logical = self.convert_physical_to_logical_state(old_value, sensor_type)
        new_logical = self.convert_physical_to_logical_state(new_value, sensor_type)
        
        old_state_str = self.get_state_string(old_logical)
        new_state_str = self.get_state_string(new_logical)

        # Check alert conditions
        self._check_alert_conditions(
            alert, sensor_name, old_logical, new_logical,
            old_state_str, new_state_str, new_signal, new_alerts
        )

        # Check for resolution
        self._check_alert_resolution(
            alert, new_logical, resolved_alerts
        )

    def _check_alert_conditions(self, alert: Aviso, sensor_name: str, 
                              old_logical: bool, new_logical: bool,
                              old_state_str: str, new_state_str: str,
                              new_signal: Signal, new_alerts: List[AvisoLog]) -> None:
        """Check if any alert conditions are met"""
        for condition in alert.config.get('conditions', []):
            if (condition.get('from_state') == old_state_str and 
                condition.get('to_state') == new_state_str):
                
                alert_log = AvisoLog(
                    aviso_id=alert.id,
                    sensor_name=sensor_name,
                    old_value=old_logical,
                    new_value=new_logical,
                    signal_id=new_signal.id,
                    triggered_at=datetime.utcnow(),
                    resolved=False
                )
                self.session.add(alert_log)
                new_alerts.append(alert_log)
                break

    def _check_alert_resolution(self, alert: Aviso, new_logical: bool, 
                              resolved_alerts: List[AvisoLog]) -> None:
        """Check if any unresolved alerts should be resolved"""
        latest_unresolved = self.get_latest_unresolved_log(alert.id)
        if latest_unresolved and latest_unresolved.new_value != new_logical:
            latest_unresolved.resolved = True
            latest_unresolved.resolved_at = datetime.utcnow()
            resolved_alerts.append(latest_unresolved)

    def get_latest_unresolved_log(self, alert_id: str) -> Optional[AvisoLog]:
        """Get the most recent unresolved log for an alert"""
        return self.session.query(AvisoLog).\
            filter_by(aviso_id=alert_id, resolved=False).\
            order_by(desc(AvisoLog.triggered_at)).\
            first()