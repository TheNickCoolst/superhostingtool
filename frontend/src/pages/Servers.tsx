import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Server, Plus, Search, Filter } from 'lucide-react';

export default function Servers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: servers, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: () => api.get('/api/servers').then(res => res.data.servers)
  });

  // Filter servers based on search and status
  const filteredServers = servers?.filter((server: any) => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          server.version.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || server.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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
            {servers?.length || 0} server{servers?.length !== 1 ? 's' : ''} total
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

      {/* Search and Filter */}
      {servers && servers.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search servers by name or version..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
              >
                <option value="ALL">All Statuses</option>
                <option value="RUNNING">Running</option>
                <option value="STOPPED">Stopped</option>
                <option value="STARTING">Starting</option>
                <option value="STOPPING">Stopping</option>
                <option value="ERROR">Error</option>
              </select>
            </div>
          </div>
          {(searchQuery || statusFilter !== 'ALL') && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredServers.length} of {servers.length} server{servers.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {servers?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-minecraft-grass bg-opacity-10 mb-4">
            <Server className="h-8 w-8 text-minecraft-grass" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No servers yet</h3>
          <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
            Create your first Minecraft server in just a few clicks! Choose your version, allocate resources, and start playing.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            ✨ One-click setup • 🚀 Instant deployment • 🔧 Easy management
          </p>
          <div className="mt-6">
            <Link
              to="/servers/create"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-minecraft-grass hover:bg-green-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Server
            </Link>
          </div>
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">No servers found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search or filter criteria
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="mt-4 text-sm text-minecraft-grass hover:text-green-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServers.map((server: any) => (
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
