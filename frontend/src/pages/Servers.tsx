import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Server, Plus } from 'lucide-react';

export default function Servers() {
  const { data: servers, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: () => api.get('/api/servers').then(res => res.data.servers)
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-minecraft-grass"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Servers</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage all your Minecraft servers
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/servers/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-minecraft-grass hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Server
          </Link>
        </div>
      </div>

      {servers?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No servers</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new Minecraft server.
          </p>
          <div className="mt-6">
            <Link
              to="/servers/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-minecraft-grass hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Server
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers?.map((server: any) => (
            <Link
              key={server.id}
              to={`/servers/${server.id}`}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {server.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    server.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                    server.status === 'STOPPED' ? 'bg-gray-100 text-gray-800' :
                    server.status === 'STARTING' ? 'bg-blue-100 text-blue-800' :
                    server.status === 'STOPPING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {server.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="font-medium text-gray-900">{server.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RAM:</span>
                    <span className="font-medium text-gray-900">{server.allocatedRam / 1024}GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU:</span>
                    <span className="font-medium text-gray-900">{server.allocatedCpu} Cores</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Port:</span>
                    <span className="font-medium text-gray-900">{server.port}</span>
                  </div>
                </div>

                {server.stats && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Players:</span>
                      <span className="font-medium text-gray-900">
                        {server.stats.onlinePlayers}/{server.maxPlayers}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
