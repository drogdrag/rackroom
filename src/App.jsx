import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref } from 'firebase/database';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

const firebaseConfig = {
  apiKey: 'AIzaSyBZCUh0-0izXwmoGOw6BiULwa7c37z4s1U',
  authDomain: 'rackroom-6e221.firebaseapp.com',
  databaseURL: 'https://rackroom-6e221-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'rackroom-6e221',
  storageBucket: 'rackroom-6e221.firebasestorage.app',
  messagingSenderId: '186466867821',
  appId: '1:186466867821:web:51899ae4456052dc6abd64',
  measurementId: 'G-68QF26T6GP',
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const currentRef = ref(database, 'current');
const historyRef = ref(database, 'history');

function getDateTimeValue(datetime) {
  if (!datetime || typeof datetime !== 'string') return 0;

  const parts = datetime.trim().split(' ');
  if (parts.length < 2) return 0;

  const [datePart, timePart] = parts;
  const [day, month, year] = datePart.split('/');
  const isoDate = `${year}-${month}-${day}T${timePart}`;
  const numeric = Date.parse(isoDate);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function getTimeFromDateTime(datetime) {
  if (!datetime) return '--';
  const parts = datetime.trim().split(' ');
  return parts.length >= 2 ? parts[1] : datetime;
}

function getDateFromDateTime(datetime) {
  if (!datetime) return '--';
  const parts = datetime.trim().split(' ');
  return parts.length >= 2 ? parts[0] : '--';
}

function getEnvironmentStatus(temperature, humidity) {
  if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
    return { text: 'Need to Improve Environment', className: 'status-bad' };
  }

  const temperatureGood = temperature >= 15 && temperature <= 30;
  const humidityGood = humidity >= 40 && humidity <= 70;
  if (temperatureGood && humidityGood) {
    return { text: 'GOOD', className: 'status-good' };
  }

  const temperatureNormal = temperature >= 5 && temperature <= 40;
  const humidityNormal = humidity >= 20 && humidity <= 80;
  if (temperatureNormal && humidityNormal) {
    return { text: 'Normal', className: 'status-normal' };
  }

  return { text: 'Need to Improve Environment', className: 'status-bad' };
}

export default function App() {
  const temperatureChartRef = useRef(null);
  const humidityChartRef = useRef(null);
  const temperatureChartInstance = useRef(null);
  const humidityChartInstance = useRef(null);

  const [connection, setConnection] = useState({
    online: false,
    text: 'กำลังเชื่อมต่อ...',
  });
  const [lastUpdate, setLastUpdate] = useState('-');
  const [temperature, setTemperature] = useState('--');
  const [humidity, setHumidity] = useState('--');
  const [temperatureStatus, setTemperatureStatus] = useState({
    text: 'GOOD',
    className: 'status-good',
  });
  const [humidityStatus, setHumidityStatus] = useState({
    text: 'GOOD',
    className: 'status-good',
  });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const unsubscribeCurrent = onValue(
      currentRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setConnection({ online: false, text: 'Disconnected' });
          return;
        }

        const temperatureValue = Number(data.temperature);
        const humidityValue = Number(data.humidity);

        setTemperature(Number.isFinite(temperatureValue) ? temperatureValue.toFixed(1) : '--');
        setHumidity(Number.isFinite(humidityValue) ? humidityValue.toFixed(1) : '--');

        const status = getEnvironmentStatus(temperatureValue, humidityValue);
        setTemperatureStatus(status);
        setHumidityStatus(status);

        if (data.datetime) {
          setLastUpdate(data.datetime);
        }

        setConnection({ online: true, text: 'Connected to Firebase' });
      },
      (error) => {
        console.error('Firebase current error:', error);
        setConnection({ online: false, text: 'Disconnected' });
      }
    );

    const unsubscribeHistory = onValue(
      historyRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setHistory([]);
          return;
        }

        const historyArray = Object.entries(data)
          .map(([key, value]) => ({ id: key, ...value }))
          .sort((a, b) => getDateTimeValue(b.datetime) - getDateTimeValue(a.datetime));

        setHistory(historyArray);
      },
      (error) => {
        console.error('Firebase history error:', error);
      }
    );

    return () => {
      unsubscribeCurrent();
      unsubscribeHistory();
    };
  }, []);

  useEffect(() => {
    if (!temperatureChartRef.current) return;

    const sorted = [...history].sort(
      (a, b) => getDateTimeValue(a.datetime) - getDateTimeValue(b.datetime)
    );
    const chartData = sorted.slice(-8);
    const labels = chartData.map((item) => getTimeFromDateTime(item.datetime));
    const values = chartData.map((item) => {
      const value = Number(item.temperature);
      return Number.isFinite(value) ? value : null;
    });

    if (temperatureChartInstance.current) {
      temperatureChartInstance.current.destroy();
    }

    temperatureChartInstance.current = new Chart(temperatureChartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: values,
            tension: 0.3,
            fill: false,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            title: { display: true, text: 'Time' },
          },
          y: {
            title: { display: true, text: 'Temperature (°C)' },
            ticks: { stepSize: 0.5 },
          },
        },
      },
    });

    return () => {
      if (temperatureChartInstance.current) {
        temperatureChartInstance.current.destroy();
      }
    };
  }, [history]);

  useEffect(() => {
    if (!humidityChartRef.current) return;

    const sorted = [...history].sort(
      (a, b) => getDateTimeValue(a.datetime) - getDateTimeValue(b.datetime)
    );
    const chartData = sorted.slice(-8);
    const labels = chartData.map((item) => getTimeFromDateTime(item.datetime));
    const values = chartData.map((item) => {
      const value = Number(item.humidity);
      return Number.isFinite(value) ? value : null;
    });

    if (humidityChartInstance.current) {
      humidityChartInstance.current.destroy();
    }

    humidityChartInstance.current = new Chart(humidityChartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Humidity (%RH)',
            data: values,
            tension: 0.3,
            fill: false,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            title: { display: true, text: 'Time' },
          },
          y: {
            title: { display: true, text: 'Humidity (%RH)' },
          },
        },
      },
    });

    return () => {
      if (humidityChartInstance.current) {
        humidityChartInstance.current.destroy();
      }
    };
  }, [history]);

  const downloadAllExcel = () => {
    if (history.length === 0) {
      alert('ไม่มีข้อมูลสำหรับดาวน์โหลด');
      return;
    }

    const sorted = [...history].sort(
      (a, b) => getDateTimeValue(a.datetime) - getDateTimeValue(b.datetime)
    );

    const excelData = sorted.map((item) => ({
      Date: getDateFromDateTime(item.datetime),
      Time: getTimeFromDateTime(item.datetime),
      'Temperature (°C)': Number.isFinite(Number(item.temperature)) ? Number(item.temperature) : '',
      'Humidity (%RH)': Number.isFinite(Number(item.humidity)) ? Number(item.humidity) : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 22 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sensor History');
    XLSX.writeFile(workbook, 'RackRoom_Sensor_History.xlsx');
  };

  return (
    <>
      <header>
        <h1>RACK ROOM MONITORING SYSTEM</h1>
        <p>Temperature &amp; Humidity Monitoring</p>
      </header>

      <main>
        <section className="status-section">
          <div>
            <span className={`dot ${connection.online ? 'online' : 'offline'}`}></span>
            <span>{connection.text}</span>
          </div>
          <div>
            Last Update:
            <span id="lastUpdate"> {lastUpdate}</span>
          </div>
        </section>

        <section className="cards">
          <div id="temperatureCard" className={`card ${temperatureStatus.className}`}>
            <div className="card-header">
              <span className="card-title">Temperature</span>
            </div>
            <div className="card-body">
              <div className="status-box">
                <span className="status-label">Status:</span>
                <span className={`status-value ${temperatureStatus.className}`}>{temperatureStatus.text}</span>
              </div>
              <div className="value-box">
                <span className="number">{temperature}</span>
                <span className="unit">°C</span>
              </div>
            </div>
          </div>

          <div id="humidityCard" className={`card ${humidityStatus.className}`}>
            <div className="card-header">
              <span className="card-title">Humidity</span>
            </div>
            <div className="card-body">
              <div className="status-box">
                <span className="status-label">Status:</span>
                <span className={`status-value ${humidityStatus.className}`}>{humidityStatus.text}</span>
              </div>
              <div className="value-box">
                <span className="number">{humidity}</span>
                <span className="unit">%RH</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>🌡️ Temperature History</h2>
          <div className="chart-container">
            <canvas ref={temperatureChartRef}></canvas>
          </div>
        </section>

        <section className="panel">
          <h2>💧 Humidity History</h2>
          <div className="chart-container">
            <canvas ref={humidityChartRef}></canvas>
          </div>
        </section>

        <section className="panel">
          <h2>📋 Measurement History</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="4">Waiting for data...</td>
                  </tr>
                ) : (
                  history.slice(0, 5).map((item) => (
                    <tr key={item.id || `${item.datetime}-${item.temperature}`}>
                      <td>{getDateFromDateTime(item.datetime)}</td>
                      <td>{getTimeFromDateTime(item.datetime)}</td>
                      <td>{item.temperature ?? '--'}</td>
                      <td>{item.humidity ?? '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>📥 Download Data</h2>
          <div className="download-buttons">
            <button type="button" onClick={downloadAllExcel}>📊 Download All Data</button>
          </div>
        </section>
      </main>

      <footer></footer>
    </>
  );
}
