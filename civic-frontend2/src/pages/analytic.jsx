/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useContext } from 'react';
import { OfficerContext } from '../context/officer.context';
import axios from 'axios';

const OfficerAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [officer, setOfficer] = useState(null);
  const data3  = useContext(OfficerContext);

  // Current officer ka data (tumhare authentication se aayega)
  const currentOfficerId = "68b322f41dd3d461a34790fa"; // Example officer ID

  // API functions
  const fetchOfficerData = async () => {
    try {
      
      setOfficer(data3?.officer);
      return data3?.officer;
    } catch (error) {
      console.error('Error fetching officer data:', error);
    }
  };

  const fetchComplaintsByDepartment = async (department, timeFilter = {}) => {
    try {
      const queryParams = new URLSearchParams({
        department,
        ...timeFilter
      });
      console.log(department);
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/complaint/complaints?${queryParams}`,{
        withCredentials:true,
        headers:{
            Authorization:`Bearer ${JSON.parse(localStorage.getItem('token2'))}`
        }
      });
      console.log(response.data)
      const complaints = await response.data;
      console.log(complaints)
      return complaints;
    } catch (error) {
      console.error('Error fetching complaints:', error);
      return [];
    }
  };

  const fetchWorkersByDepartment = async (department) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/worker/workers?department=${department}`,{
        withCredentials:true,
        headers:{
        Authorization:`Bearer ${JSON.parse(localStorage.getItem('token2'))}`
        }
      });
      console.log(response.data);
      const workers = await response.data;
      return workers;
    } catch (error) {
      console.error('Error fetching workers:', error);
      return [];
    }
  };

  // Time range filter function
  const getTimeFilter = (range) => {
    const now = new Date();
    const filter = {};
    
    switch (range) {
      case 'week':
        filter.startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
        break;
      case 'month':
        filter.startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        break;
      case 'quarter':
        filter.startDate = new Date(now.setMonth(now.getMonth() - 3)).toISOString();
        break;
      case 'year':
        filter.startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
        break;
      default:
        filter.startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
    }
    
    return filter;
  };

  // Data processing functions
  const processAnalyticsData = (complaints, workers, officer) => {
    // Overview stats
    const totalComplaints = complaints.length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    const pending = complaints.filter(c => c.status === 'Pending').length;
    const inProgress = complaints.filter(c => c.status === 'Assigned' || c.status === 'Approved').length;
    
    // Average resolution time calculation
    const resolvedComplaints = complaints.filter(c => c.status === 'Resolved');
    const totalResolutionTime = resolvedComplaints.reduce((acc, complaint) => {
      const created = new Date(complaint.createdAt);
      const updated = new Date(complaint.updatedAt);
      return acc + (updated - created);
    }, 0);
    
    const averageResolutionTime = resolvedComplaints.length > 0 
      ? `${(totalResolutionTime / (resolvedComplaints.length * 24 * 60 * 60 * 1000)).toFixed(1)} days`
      : '0 days';

    // Monthly stats calculation
    const monthlyStats = calculateMonthlyStats(complaints);
    
    // Problem type distribution
    const problemTypes = calculateProblemTypes(complaints);
    
    // Severity distribution
    const severityDistribution = calculateSeverityDistribution(complaints);
    
    // Recent complaints (last 10)
    const recentComplaints = complaints
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(complaint => ({
        id: complaint._id,
        user: complaint.name,
        problem: complaint.problem_type,
        severity: complaint.severity_level,
        status: complaint.status,
        worker: complaint.assignedWorker ? 'Assigned' : 'Not Assigned',
        date: new Date(complaint.createdAt).toLocaleDateString(),
        address: complaint.address
      }));

    // Worker performance
    const workerPerformance = calculateWorkerPerformance(complaints, workers);

    return {
      overview: {
        totalComplaints,
        resolved,
        pending,
        inProgress,
        averageResolutionTime
      },
      monthlyStats,
      problemTypes,
      severityDistribution,
      recentComplaints,
      workerPerformance
    };
  };

  const calculateMonthlyStats = (complaints) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthComplaints = complaints.filter(complaint => {
        const date = new Date(complaint.createdAt);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      
      const resolved = monthComplaints.filter(c => c.status === 'Resolved').length;
      
      return {
        month,
        complaints: monthComplaints.length,
        resolved
      };
    }).filter(month => month.complaints > 0);
  };

  const calculateProblemTypes = (complaints) => {
    const problemCount = complaints.reduce((acc, complaint) => {
      const type = complaint.problem_type || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    return Object.entries(problemCount).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  };

  const calculateSeverityDistribution = (complaints) => {
    const severityCount = complaints.reduce((acc, complaint) => {
      const level = complaint.severity_level || 'medium';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    const colors = {
      high: '#FF6B6B',
      medium: '#FFD93D',
      low: '#6BCF7F'
    };

    return Object.entries(severityCount).map(([level, count]) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      count,
      color: colors[level] || '#CCCCCC'
    }));
  };

  const calculateWorkerPerformance = (complaints, workers) => {
    console.log("ok",workers);
    return workers.map(worker => {
      const workerComplaints = complaints.filter(complaint => 
        complaint.assignedWorker === worker._id
      );
      console.log(complaints,worker._id);
      const completed = workerComplaints.filter(c => c.status === 'Resolved').length;
      const pending = workerComplaints.filter(c => c.status !== 'Resolved').length;
      
      // Simple rating calculation based on completion rate
      const totalAssigned = workerComplaints.length;
      const rating = totalAssigned > 0 ? ((completed / totalAssigned) * 4 + 1).toFixed(1) : 0;
      
      return {
        name: worker.name,
        completed,
        pending,
        rating: parseFloat(rating)
      };
    }).filter(worker => worker.completed > 0 || worker.pending > 0);
  };

  // Load data on component mount and when timeRange changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch officer data first
        const officerData = await fetchOfficerData();
        if (!officerData) return;

        // Fetch complaints and workers for this department
        const timeFilter = getTimeFilter(timeRange);
        const [complaints, workers] = await Promise.all([
          fetchComplaintsByDepartment(officerData.department, timeFilter),
          fetchWorkersByDepartment(officerData.department)
        ]);

        // Process and set analytics data
        const processedData = processAnalyticsData(complaints, workers, officerData);
        setAnalyticsData(processedData);
        
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  // Default data structure for initial render
  const defaultData = {
    overview: {
      totalComplaints: 0,
      resolved: 0,
      pending: 0,
      inProgress: 0,
      averageResolutionTime: '0 days'
    },
    monthlyStats: [],
    problemTypes: [],
    severityDistribution: [],
    recentComplaints: [],
    workerPerformance: []
  };

  const data = analyticsData || defaultData;

  const StatCard = ({ title, value, subtitle, icon, color, delay }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );

  const SeverityBadge = ({ level }) => {
    const levelLower = level.toLowerCase();
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[levelLower] || 'bg-gray-100 text-gray-800'}`}>
        {level}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      Assigned: 'bg-blue-100 text-blue-800',
      Approved: 'bg-orange-100 text-orange-800',
      Pending: 'bg-gray-100 text-gray-800',
      Resolved: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back, Officer {officer?.name} • {officer?.department?.replace('_', ' ').toUpperCase()} Department
        </p>
        
        {/* Time Range Filter */}
        <div className="flex gap-2 mt-4">
          {['week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Complaints"
          value={data.overview.totalComplaints}
          subtitle={`In ${timeRange}`}
          icon="📊"
          color="text-blue-500"
          delay={0.1}
        />
        <StatCard
          title="Resolved"
          value={data.overview.resolved}
          subtitle={`${data.overview.totalComplaints > 0 ? ((data.overview.resolved / data.overview.totalComplaints) * 100).toFixed(1) : 0}% resolution rate`}
          icon="✅"
          color="text-green-500"
          delay={0.2}
        />
        <StatCard
          title="In Progress"
          value={data.overview.inProgress}
          subtitle="Active cases"
          icon="🔄"
          color="text-orange-500"
          delay={0.3}
        />
        <StatCard
          title="Avg. Resolution Time"
          value={data.overview.averageResolutionTime}
          subtitle="Across resolved complaints"
          icon="⏱️"
          color="text-purple-500"
          delay={0.4}
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white rounded-2xl p-1 shadow-lg inline-flex">
          {['overview', 'complaints', 'workers', 'insights'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Monthly Complaints Trend
                </h3>
                {data.monthlyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="complaints" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        name="Total Complaints"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="resolved" 
                        stroke="#10B981" 
                        strokeWidth={3}
                        name="Resolved"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-300 flex items-center justify-center text-gray-500">
                    No data available for the selected period
                  </div>
                )}
              </motion.div>

              {/* Problem Types */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Problem Type Distribution
                </h3>
                {data.problemTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.problemTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.problemTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-300 flex items-center justify-center text-gray-500">
                    No problem type data available
                  </div>
                )}
              </motion.div>
            </div>

            {/* Recent Complaints */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Recent Complaints
              </h3>
              {data.recentComplaints.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-gray-600 font-medium">Complaint ID</th>
                        <th className="text-left py-3 text-gray-600 font-medium">User</th>
                        <th className="text-left py-3 text-gray-600 font-medium">Problem</th>
                        <th className="text-left py-3 text-gray-600 font-medium">Severity</th>
                        <th className="text-left py-3 text-gray-600 font-medium">Status</th>
                        <th className="text-left py-3 text-gray-600 font-medium">Worker</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentComplaints.map((complaint, index) => (
                        <motion.tr
                          key={complaint.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 * index }}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 text-sm font-mono text-gray-600">
                            {complaint.id.slice(-8)}
                          </td>
                          <td className="py-3 font-medium text-gray-900">
                            {complaint.user}
                          </td>
                          <td className="py-3 text-gray-700">{complaint.problem}</td>
                          <td className="py-3">
                            <SeverityBadge level={complaint.severity} />
                          </td>
                          <td className="py-3">
                            <StatusBadge status={complaint.status} />
                          </td>
                          <td className="py-3 text-gray-700">
                            {complaint.worker}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent complaints found
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'workers' && (
          <motion.div
            key="workers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Worker Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Worker Performance
                </h3>
                {data.workerPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.workerPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" fill="#10B981" name="Completed" />
                      <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-300 flex items-center justify-center text-gray-500">
                    No worker performance data available
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Worker Ratings
                </h3>
                {data.workerPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {data.workerPerformance.map((worker, index) => (
                      <motion.div
                        key={worker.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{worker.name}</h4>
                          <p className="text-sm text-gray-600">
                            {worker.completed} completed • {worker.pending} pending
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500 text-lg">⭐</span>
                          <span className="font-bold text-gray-900">{worker.rating}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No worker data available
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Severity Distribution */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Severity Distribution
              </h3>
              {data.severityDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.severityDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count">
                      {data.severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-gray-500">
                  No severity data available
                </div>
              )}
            </motion.div>

            {/* Performance Metrics */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Key Performance Indicators
              </h3>
              <div className="space-y-4">
                {[
                  { 
                    label: 'Response Time', 
                    value: `${data.overview.inProgress > 0 ? '2.1h' : 'N/A'}`, 
                    trend: '+5%' 
                  },
                  { 
                    label: 'Resolution Rate', 
                    value: `${data.overview.totalComplaints > 0 ? ((data.overview.resolved / data.overview.totalComplaints) * 100).toFixed(1) + '%' : '0%'}`, 
                    trend: '+2%' 
                  },
                  { 
                    label: 'Customer Satisfaction', 
                    value: `${data.workerPerformance.length > 0 ? (data.workerPerformance.reduce((acc, w) => acc + w.rating, 0) / data.workerPerformance.length).toFixed(1) + '/5' : 'N/A'}`, 
                    trend: '+0.3' 
                  },
                  { 
                    label: 'Worker Utilization', 
                    value: `${data.workerPerformance.length > 0 ? ((data.workerPerformance.filter(w => w.completed > 0).length / data.workerPerformance.length) * 100).toFixed(0) + '%' : '0%'}`, 
                    trend: '-3%' 
                  },
                ].map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-700">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{metric.value}</span>
                      <span className={`text-sm ${
                        metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.trend}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OfficerAnalyticsDashboard;