from flask_mail import Mail, Message
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self, app=None):
        self.mail = Mail()
        if app:
            self.init_app(app)

    def init_app(self, app):
        # Configure Flask-Mail
        app.config['MAIL_SERVER'] = app.config.get('MAIL_SERVER', 'smtp.gmail.com')
        app.config['MAIL_PORT'] = app.config.get('MAIL_PORT', 587)
        app.config['MAIL_USE_TLS'] = app.config.get('MAIL_USE_TLS', True)
        app.config['MAIL_USERNAME'] = app.config.get('MAIL_USERNAME')
        app.config['MAIL_PASSWORD'] = app.config.get('MAIL_PASSWORD')
        app.config['MAIL_DEFAULT_SENDER'] = app.config.get('MAIL_DEFAULT_SENDER')

        self.mail.init_app(app)

    def send_sensor_alert_email(self, to_email, controlador_name, sensor_name, value):
        """
        Send an email alert for sensor state change
        """
        try:
            subject = f"Alert: Sensor Status Change - {controlador_name}"
            
            # Create message body
            body = f"""
            Alert Notification

            Controller: {controlador_name}
            Sensor: {sensor_name}
            Current State: {'Active' if value else 'Inactive'}

            This is an automated message. Please do not reply.
            """

            msg = Message(
                subject=subject,
                recipients=[to_email],
                body=body
            )

            self.mail.send(msg)
            logger.info(f"Alert email sent successfully to {to_email} for {controlador_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email alert: {str(e)}")
            return False