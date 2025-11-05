import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Server, HardDrive, Cpu, Activity, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Onboarding from '../components/Onboarding';

export default function Dashboard() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: servers } = useQuery({
    queryKey: ['servers'],
    queryFn: () => api.get('/api/servers').then(res => res.data.servers)
  });

  // Check if user should see onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    const justRegistered = localStorage.getItem('justRegistered');

    if (!hasSeenOnboarding || justRegistered === 'true') {
      setShowOnboarding(true);
      localStorage.removeItem('justRegistered');
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  const stats = {
    totalServers: servers?.length || 0,
    runningServers: servers?.filter((s: any) => s.status === 'RUNNING').length || 0,
    totalRam: servers?.reduce((sum: number, s: any) => sum + s.allocatedRam, 0) || 0,
    totalCpu: servers?.reduce((sum: number, s: any) => sum + s.allocatedCpu, 0) || 0
  };

  return (
    <>
      {showOnboarding && user && (
        <Onboarding user={user} onComplete={handleOnboardingComplete} />
      )}

      <div className="px-4 py-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage your Minecraft servers
            </p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            title="Einführung anzeigen"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Hilfe & Tour
          </button>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="h-6 w-6 text-minecraft-grass" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Servers
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalServers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Running Servers
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.runningServers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HardDrive className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total RAM
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {(stats.totalRam / 1024).toFixed(1)} GB
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Cpu className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total CPU
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalCpu} Cores
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex space-x-4">
          <Link
            to="/servers/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-minecraft-grass hover:bg-green-700"
          >
            <Server className="w-4 h-4 mr-2" />
            Create New Server
          </Link>
        </div>
      </div>

      {/* Recent Servers */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Servers</h2>
          {servers && servers.length > 5 && (
            <Link to="/servers" className="text-sm text-minecraft-grass hover:text-green-700 font-medium">
              View all →
            </Link>
          )}
        </div>
        {!servers || servers.length === 0 ? (
          <div className="text-center py-8">
            <Server className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-4">
              You haven't created any servers yet
            </p>
            <Link
              to="/servers/create"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-minecraft-grass hover:text-green-700"
            >
              Create your first server →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.slice(0, 5).map((server: any) => (
              <Link
                key={server.id}
                to={`/servers/${server.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-minecraft-grass hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{server.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {server.version} • {server.allocatedRam / 1024}GB RAM • {server.allocatedCpu} CPU
                    </p>
                  </div>
                  <div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      server.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                      server.status === 'STOPPED' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {server.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
