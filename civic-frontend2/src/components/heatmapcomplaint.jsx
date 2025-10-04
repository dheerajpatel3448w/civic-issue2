/* eslint-disable no-unused-vars */
import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet.heat';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Filter, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom hook for heatmap layer
const Heatmap = ({ points }) => {
  const map = useMap();

  React.useEffect(() => {
    if (!points.length) return;

    const heatLayer = L.heatLayer(
      points.map(point => [point.lat, point.lon, point.intensity]),
      {
        minOpacity: 0.4,
        maxZoom: 18,
        radius: 25,
        blur: 15,
        gradient: {
          0.4: 'blue',
          0.6: 'cyan',
          0.7: 'lime',
          0.8: 'yellow',
          1.0: 'red'
        }
      }
    );

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
}, [map, points]);

  return null;
};
const ComplaintHeatmap = ({officer,complaints}) => {
      

 
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [dateRange, setDateRange] = useState('All');

  // Process data for heatmap and charts
  const processedData = useMemo(() => {
    const filteredComplaints = complaints?.filter(complaint => {
      const statusMatch = selectedStatus === 'All' || complaint.status === selectedStatus;
      const severityMatch = selectedSeverity === 'All' || complaint.severity_level === selectedSeverity;
      
      let dateMatch = true;
      if (dateRange !== 'All') {
        const complaintDate = new Date(complaint.createdAt);
        const now = new Date();
        const daysDiff = Math.floor((now - complaintDate) / (1000 * 60 * 60 * 24));
        
        if (dateRange === 'Today' && daysDiff > 0) dateMatch = false;
        if (dateRange === 'Week' && daysDiff > 7) dateMatch = false;
        if (dateRange === 'Month' && daysDiff > 30) dateMatch = false;
      }
      
      return statusMatch && severityMatch && dateMatch;
    });

    // Heatmap points with intensity based on severity
    const heatmapPoints = filteredComplaints?.map(complaint => {
      let intensity = 0.3;
      if (complaint.severity_level === 'medium') intensity = 0.6;
      if (complaint.severity_level === 'high') intensity = 1.0;
      
      return {
        lat: complaint.location.lat,
        lon: complaint.location.lon,
        intensity,
        ...complaint
      };
    });

    // Status distribution for pie chart
    const statusData = Object?.entries(
      filteredComplaints?.reduce((acc, complaint) => {
        acc[complaint.status] = (acc[complaint.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Severity distribution for bar chart
    const severityData = Object?.entries(
      filteredComplaints?.reduce((acc, complaint) => {
        acc[complaint.severity_level] = (acc[complaint.severity_level] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Daily complaints trend
    const dailyData = filteredComplaints?.reduce((acc, complaint) => {
      const date = new Date(complaint.createdAt).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const trendData = Object?.entries(dailyData)
      .map(([date, count]) => ({ date, complaints: count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      filteredComplaints,
      heatmapPoints,
      statusData,
      severityData,
      trendData,
      stats: {
        total: filteredComplaints?.length,
        pending: filteredComplaints?.filter(c => c.status === 'Pending').length,
        inProgress: filteredComplaints?.filter(c => c.status === 'In Progress').length,
        resolved: filteredComplaints?.filter(c => c.status === 'Resolved').length,
        highSeverity: filteredComplaints?.filter(c => c.severity_level === 'high').length,
      }
    };
  }, [complaints, selectedStatus, selectedSeverity, dateRange]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Complaint Heatmap Analytics
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              Officer: <span className="font-semibold text-indigo-600">{officer.name}</span> | 
              Area: <span className="font-semibold text-indigo-600">{officer.city}</span> | 
              Department: <span className="font-semibold text-indigo-600">{officer.department}</span>
            </p>
          </div>
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{processedData.stats.total}</p>
              <p className="text-sm text-gray-500">Total Complaints</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-800">{processedData.stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-800">{processedData.stats.inProgress}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-800">{processedData.stats.resolved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Severity</p>
              <p className="text-2xl font-bold text-gray-800">{processedData.stats.highSeverity}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select 
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="All">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="Week">Last Week</option>
            <option value="Month">Last Month</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Map Container */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Complaint Density Heatmap</h2>
          <div className="h-96 rounded-lg overflow-hidden">
            <MapContainer
              center={[officer.location.lat, officer.location.lon]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Heatmap points={processedData.heatmapPoints} />
              
              {/* Individual complaint markers */}
              {processedData.filteredComplaints.map((complaint, index) => (
                <CircleMarker
                  key={complaint._id}
                  center={[complaint.location.lat, complaint.location.lon]}
                  radius={8}
                  fillColor={complaint.severity_level === 'high' ? '#ef4444' : complaint.severity_level === 'medium' ? '#f59e0b' : '#10b981'}
                  color="#fff"
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.6}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-lg">{complaint.problem_type}</h3>
                      <p className="text-sm text-gray-600">{complaint.description.slice(0, 100)}...</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs"><strong>Status:</strong> {complaint.status}</p>
                        <p className="text-xs"><strong>Severity:</strong> {complaint.severity_level}</p>
                        <p className="text-xs"><strong>Date:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Charts Container */}
        <div className="space-y-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Status Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {processedData.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Severity Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.severityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Number of Complaints" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Complaints</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Problem Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Severity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {processedData.filteredComplaints.slice(0, 10).map((complaint) => (
                <tr key={complaint._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{complaint.problem_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      complaint.severity_level === 'high' ? 'bg-red-100 text-red-800' :
                      complaint.severity_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {complaint.severity_level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      complaint.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                      complaint.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      complaint.status === 'Assigned' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {complaint.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">
                    {complaint.address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComplaintHeatmap;