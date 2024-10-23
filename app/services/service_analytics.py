from datetime import datetime, timedelta
from sqlalchemy import func, case, and_, extract
from ..models import Signal, Controlador
import logging

logger = logging.getLogger(__name__)

class CycleAnalyticsService:
    def __init__(self, session):
        self.session = session

    def get_cycle_times(self, controlador_id, start_date, end_date):
        """Calculate cycle times based on 'Lleno' sensor activations"""
        try:
            # Get all signals where Lleno changed from False to True
            signals = self.session.query(Signal).\
                filter(
                    Signal.controlador_id == controlador_id,
                    Signal.tstamp.between(start_date, end_date)
                ).\
                order_by(Signal.tstamp).all()
            
            cycles = []
            cycle_start = None
            
            for i in range(len(signals) - 1):
                current = signals[i]
                next_signal = signals[i + 1]
                
                # If Lleno transitions from False to True, it's the end of a cycle
                if not current.value_sensor1 and next_signal.value_sensor1:
                    if cycle_start:
                        cycle_duration = next_signal.tstamp - cycle_start
                        cycles.append({
                            'start_time': cycle_start,
                            'end_time': next_signal.tstamp,
                            'duration_minutes': cycle_duration.total_seconds() / 60
                        })
                    cycle_start = next_signal.tstamp
                
                # If Lleno transitions from True to False, it's the start of a new cycle
                elif current.value_sensor1 and not next_signal.value_sensor1:
                    cycle_start = next_signal.tstamp

            return cycles

        except Exception as e:
            logger.error(f"Error getting cycle times: {str(e)}")
            return []

    def get_cycle_analytics(self, controlador_id, days=7):
        """Get comprehensive cycle analytics"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            cycles = self.get_cycle_times(controlador_id, start_date, end_date)
            
            if not cycles:
                return None
            
            # Calculate metrics
            cycle_durations = [cycle['duration_minutes'] for cycle in cycles]
            avg_cycle_time = sum(cycle_durations) / len(cycle_durations)
            
            # Calculate daily distribution
            daily_cycles = {}
            for cycle in cycles:
                date = cycle['start_time'].date()
                daily_cycles[date] = daily_cycles.get(date, 0) + 1
            
            # Calculate efficiency (cycles within 10% of average time)
            target_time = avg_cycle_time
            efficiency_margin = target_time * 0.1
            optimal_cycles = sum(
                1 for duration in cycle_durations 
                if abs(duration - target_time) <= efficiency_margin
            )
            efficiency_rate = (optimal_cycles / len(cycles)) * 100

            # Calculate hourly distribution
            hourly_distribution = {f"{i:02d}-{(i+4):02d}": 0 for i in range(0, 24, 4)}
            for cycle in cycles:
                hour = cycle['start_time'].hour
                period = f"{(hour // 4 * 4):02d}-{(hour // 4 * 4 + 4):02d}"
                hourly_distribution[period] += 1

            return {
                'summary': {
                    'avg_cycle_time': round(avg_cycle_time, 2),
                    'total_cycles': len(cycles),
                    'efficiency_rate': round(efficiency_rate, 2),
                    'cycles_today': daily_cycles.get(datetime.now().date(), 0),
                },
                'cycle_times': [
                    {
                        'date': cycle['start_time'].strftime('%m/%d'),
                        'cycleTime': round(cycle['duration_minutes'], 2),
                        'target': round(target_time, 2)
                    }
                    for cycle in cycles
                ],
                'hourly_distribution': [
                    {'hour': hour, 'cycles': count}
                    for hour, count in hourly_distribution.items()
                ],
                'efficiency_distribution': [
                    {
                        'name': 'Optimal Cycles',
                        'value': optimal_cycles
                    },
                    {
                        'name': 'Delayed Cycles',
                        'value': sum(1 for d in cycle_durations if d > target_time + efficiency_margin)
                    },
                    {
                        'name': 'Interrupted Cycles',
                        'value': sum(1 for d in cycle_durations if d < target_time - efficiency_margin)
                    }
                ]
            }

        except Exception as e:
            logger.error(f"Error calculating cycle analytics: {str(e)}")
            return None

    def export_cycle_report(self, controlador_id, start_date, end_date, format='csv'):
        """Export cycle data in various formats"""
        try:
            cycles = self.get_cycle_times(controlador_id, start_date, end_date)
            
            if format == 'csv':
                import csv
                import io
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(['Start Time', 'End Time', 'Duration (minutes)'])
                for cycle in cycles:
                    writer.writerow([
                        cycle['start_time'],
                        cycle['end_time'],
                        cycle['duration_minutes']
                    ])
                return output.getvalue()
            
            return cycles  # Default to JSON format
            
        except Exception as e:
            logger.error(f"Error exporting cycle report: {str(e)}")
            return None