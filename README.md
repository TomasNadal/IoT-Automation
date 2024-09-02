# IoT Automation Platform

## Overview

This IoT Sensor Monitoring Platform is a personal project in development, designed to receive and display data from Arduino-based sensors. The primary goal is to create a system that can monitor the state of various sensors and present this information to users in a clear, intuitive manner.

## Project Objectives

- Receive real-time data from Arduino devices monitoring different sensors
- Store sensor data efficiently for historical analysis
- Display current sensor states and historical data through a user-friendly web interface
- Provide alerts for significant sensor state changes
- Build a robust foundation to scale

## Current Features

- **Data Ingestion**: API endpoint to receive sensor data from Arduino devices
- **Data Storage**: PostgreSQL database with TimescaleDB for efficient time-series data handling
- **React Web Interface**: Simple dashboard in development to view current sensor states
- **Real-time Updates**: WebSocket integration for live data updates

## Tech Stack

- **Backend**: Python, Flask, SQLAlchemy
- **Frontend**: React (basic implementation)
- **Database**: PostgreSQL with TimescaleDB extension
- **Real-time Communication**: Flask-SocketIO

## Project Status

This project is still in active development. Many features are experimental and may change. Current focus areas include:

- Improving data visualization
- Enhancing the reliability of the Arduino data ingestion process
- Implementing a more robust alert system
- Expanding the frontend functionality (JWT, data-visualization, etc.)

## Project Structure
IoT-Automation/
├── flask_app/                  # Backend Flask application
│   ├── api/
│   │   ├── arduino.py          # IoT device data ingestion endpoints
│   │   └── dashboard.py        # Dashboard data endpoints
│   ├── models.py               # SQLAlchemy models
│   ├── db_utils.py             # Database utility functions
│   └── socket_events.py        # WebSocket event handlers
├── react_frontend/             # Frontend React application
│   └── src/
│       ├── components/
│       ├── scenes/
│       └── App.jsx
└── README.md                   # Project documentation


## Getting Started

1. Clone the repository
2. Set up the backend:
  cd flask_app
  pip install -r requirements.txt
  flask db upgrade
  flask run

3. Set up the frontend:
  cd react_frontend
  npm install
  npm start

4. Navigate to `http://localhost:3000` in your browser


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
