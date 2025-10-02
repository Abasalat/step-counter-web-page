import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  // Define fetchData using useCallback to memoize and avoid re-creation
  const fetchData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError('');
    setDebugInfo('');

    try {
      console.log('Fetching data for user:', user.email);

      // Query with where clause for userId
      const stepsQuery = query(collection(db, 'steps'), where('userId', '==', user.uid));
      const snapshot = await getDocs(stepsQuery);

      console.log('Total documents found:', snapshot.size);

      if (snapshot.empty) {
        setDebugInfo(`No documents found for user ${user.email}. Check if:
1. Data exists in Firestore
2. The 'userId' field matches exactly
3. Collection name is 'steps'`);
        setStepData([]);
        setIsLoading(false);
        return;
      }

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
  }, [user]); // Dependency on user ensures fetchData updates when user changes

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    // Check for online status
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network.');
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [user, loading, router]); // Removed fetchData from deps, handled by useCallback

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
            <p className="text-sm text-gray-600 mt-1">User Email: {user?.email}</p> {/* Replaced User ID with User Email */}
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
      </div>
    </div>
  );
}