import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stepData, setStepData] = useState([]);
  const [rawData, setRawData] = useState([]); // For debugging
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [user, loading, router]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError('');
    setDebugInfo('');
    
    try {
      console.log('Fetching data for user:', user.uid);
      
      // First, try to get ALL data without filters to see what's there
      const stepsQuery = query(
        collection(db, 'steps'),
        where('userId', '==', user.uid)
      );
      
      const snapshot = await getDocs(stepsQuery);
      
      console.log('Total documents found:', snapshot.size);
      
      if (snapshot.empty) {
        setDebugInfo(`No documents found for user ${user.uid}. Check if:
1. Data exists in Firestore
2. The 'userId' field matches exactly
3. Collection name is 'steps'`);
        setStepData([]);
        setIsLoading(false);
        return;
      }

      // Log all raw data for debugging
      const allRawData = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Raw document:', doc.id, data);
        allRawData.push({ id: doc.id, ...data });
      });
      setRawData(allRawData);

      // Process the data
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        let timestamp;
        
        console.log('Processing doc:', doc.id, 'timestamp type:', typeof docData.timestamp, 'value:', docData.timestamp);
        
        // Handle different timestamp formats
        if (docData.timestamp?.toDate) {
          // Firestore Timestamp object
          timestamp = docData.timestamp.toDate();
          console.log('Converted Firestore timestamp to:', timestamp);
        } else if (docData.timestamp?.seconds) {
          // Firestore Timestamp-like object
          timestamp = new Date(docData.timestamp.seconds * 1000);
          console.log('Converted seconds to:', timestamp);
        } else if (typeof docData.timestamp === 'number') {
          // Unix timestamp in milliseconds
          timestamp = new Date(docData.timestamp);
          console.log('Converted number to:', timestamp);
        } else if (typeof docData.timestamp === 'string') {
          // ISO string
          timestamp = new Date(docData.timestamp);
          console.log('Converted string to:', timestamp);
        } else {
          console.warn('Unknown timestamp format:', docData.timestamp);
          timestamp = new Date(); // Fallback to now
        }

        return {
          id: doc.id,
          steps: docData.steps || docData.stepCount || 0, // Try both field names
          timestamp: timestamp,
          originalTimestamp: docData.timestamp // Keep original for debugging
        };
      });

      // Sort by timestamp
      data.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log('Processed data:', data);
      setStepData(data);
      
      setDebugInfo(`Successfully loaded ${data.length} records. Latest timestamp: ${data[data.length - 1]?.timestamp.toLocaleString()}`);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error fetching data: ' + err.message);
      setDebugInfo('Error details: ' + JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = {
    labels: stepData.map(item => {
      const date = item.timestamp;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }),
    datasets: [
      {
        label: 'Steps Over Time',
        data: stepData.map(item => item.steps),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: { display: true, text: 'Your Step Count Over Time', font: { size: 20 } },
      legend: { position: 'top' },
    },
    scales: {
      x: { title: { display: true, text: 'Time' } },
      y: { title: { display: true, text: 'Steps' }, beginAtZero: true },
    },
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-blue-600">Your Step Data</h2>
            <p className="text-sm text-gray-600 mt-1">User ID: {user?.uid}</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-200"
          >
            Logout
          </button>
        </div>

        {/* Debug Information */}
        {debugInfo && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-bold text-blue-800 mb-2">Debug Info:</h3>
            <p className="text-sm text-blue-700 whitespace-pre-wrap">{debugInfo}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading data...</p>
          </div>
        ) : stepData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No step data available yet.</p>
            <button
              onClick={fetchData}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Data
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <Line data={chartData} options={options} />
            </div>

            {/* Data Statistics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-blue-600">{stepData.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Steps</p>
                <p className="text-2xl font-bold text-green-600">
                  {stepData.reduce((sum, item) => sum + item.steps, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Average</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(stepData.reduce((sum, item) => sum + item.steps, 0) / stepData.length)}
                </p>
              </div>
            </div>

            {/* Raw Data Table for Debugging */}
            <details className="mb-4">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-semibold">
                Show Raw Data (for debugging)
              </summary>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Document ID</th>
                      <th className="px-4 py-2 text-left">Steps</th>
                      <th className="px-4 py-2 text-left">Timestamp</th>
                      <th className="px-4 py-2 text-left">Original Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stepData.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{item.id}</td>
                        <td className="px-4 py-2">{item.steps}</td>
                        <td className="px-4 py-2">{item.timestamp.toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs">
                          <code>{JSON.stringify(item.originalTimestamp)}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {/* Recent Activity */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {stepData.slice(-5).reverse().map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded">
                    <span className="text-gray-600">
                      {item.timestamp.toLocaleString()}
                    </span>
                    <span className="font-semibold text-blue-600">
                      {item.steps} steps
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Console Log Button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              console.log('=== FULL DEBUG INFO ===');
              console.log('User:', user);
              console.log('Raw Data:', rawData);
              console.log('Processed Data:', stepData);
              alert('Check browser console (F12) for full debug info');
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
          >
            Log Debug Info to Console
          </button>
        </div>
      </div>
    </div>
  );
}