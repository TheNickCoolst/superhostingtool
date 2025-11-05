import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Play, Square, RotateCw, Trash2, Settings, ArrowLeft } from 'lucide-react';

export default function ServerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newRam, setNewRam] = useState(2048);
  const [newCpu, setNewCpu] = useState(1);

  const { data: serverData, isLoading } = useQuery({
    queryKey: ['server', id],
    queryFn: () => api.get(`/api/servers/${id}`).then(res => res.data.server),
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const startMutation = useMutation({
    mutationFn: () => api.post(`/api/servers/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server', id] })
  });

  const stopMutation = useMutation({
    mutationFn: () => api.post(`/api/servers/${id}/stop`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server', id] })
  });

  const restartMutation = useMutation({
    mutationFn: () => api.post(`/api/servers/${id}/restart`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server', id] })
  });

  const updateResourcesMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/api/servers/${id}/resources`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      setShowResourceModal(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/servers/${id}`),
    onSuccess: () => navigate('/servers')
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-minecraft-grass"></div>
      </div>
    );
  }

  const server = serverData;

  return (
    <div className="px-4 py-6">
      <button
        onClick={() => navigate('/servers')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Servers
      </button>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{server.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {server.version} • {server.minecraftVersion}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
            server.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
            server.status === 'STOPPED' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {server.status}
          </span>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex space-x-3">
          <button
            onClick={() => startMutation.mutate()}
            disabled={server.status === 'RUNNING' || startMutation.isPending}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </button>

          <button
            onClick={() => stopMutation.mutate()}
            disabled={server.status === 'STOPPED' || stopMutation.isPending}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            <Square className="w-4 h-4 mr-1" />
            Stop
          </button>

          <button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <RotateCw className="w-4 h-4 mr-1" />
            Restart
          </button>

          <button
            onClick={() => {
              setNewRam(server.allocatedRam);
              setNewCpu(server.allocatedCpu);
              setShowResourceModal(true);
            }}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Settings className="w-4 h-4 mr-1" />
            Resources
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
                deleteMutation.mutate();
              }
            }}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </button>
        </div>

        {/* Server Info */}
        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Connection</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {server.host?.ipAddress}:{server.port}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Players</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {server.stats?.onlinePlayers || 0}/{server.maxPlayers}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Allocated RAM</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {server.allocatedRam / 1024} GB
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Allocated CPU</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {server.allocatedCpu} Cores
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Difficulty</dt>
              <dd className="mt-1 text-sm text-gray-900">{server.difficulty}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Game Mode</dt>
              <dd className="mt-1 text-sm text-gray-900">{server.gameMode}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Resource Update Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Update Resources
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Resources will be updated with minimal downtime (live update if possible)
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  RAM (MB)
                </label>
                <select
                  value={newRam}
                  onChange={(e) => setNewRam(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                >
                  <option value="1024">1 GB</option>
                  <option value="2048">2 GB</option>
                  <option value="4096">4 GB</option>
                  <option value="8192">8 GB</option>
                  <option value="16384">16 GB</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CPU Cores
                </label>
                <select
                  value={newCpu}
                  onChange={(e) => setNewCpu(parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                >
                  <option value="0.5">0.5 Cores</option>
                  <option value="1">1 Core</option>
                  <option value="2">2 Cores</option>
                  <option value="4">4 Cores</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowResourceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateResourcesMutation.mutate({ allocatedRam: newRam, allocatedCpu: newCpu })}
                disabled={updateResourcesMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-minecraft-grass hover:bg-green-700 disabled:opacity-50"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
