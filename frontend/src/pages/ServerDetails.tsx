import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Play, Square, RotateCw, Trash2, Settings, ArrowLeft, Copy, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import Tooltip from '../components/Tooltip';

export default function ServerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [newRam, setNewRam] = useState(2048);
  const [newCpu, setNewCpu] = useState(1);
  const [copied, setCopied] = useState(false);

  const { data: serverData, isLoading } = useQuery({
    queryKey: ['server', id],
    queryFn: () => api.get(`/api/servers/${id}`).then(res => res.data.server),
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const startMutation = useMutation({
    mutationFn: () => api.post(`/api/servers/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      toast.success('Server is starting...');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start server');
    }
  });

  const stopMutation = useMutation({
    mutationFn: () => api.post(`/api/servers/${id}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      setShowStopDialog(false);
      toast.success('Server is stopping...');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to stop server');
    }
  });

  const restartMutation = useMutation({
    mutationFn: () => api.post(`/api/servers/${id}/restart`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      toast.success('Server is restarting... (3-5 seconds downtime)');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to restart server');
    }
  });

  const updateResourcesMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/api/servers/${id}/resources`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', id] });
      setShowResourceModal(false);
      toast.success('Resources updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update resources');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/servers/${id}`),
    onSuccess: () => {
      toast.success('Server deleted successfully');
      navigate('/servers');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete server');
    }
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Connection info copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

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
      <Toaster position="top-right" />
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
            onClick={() => setShowStopDialog(true)}
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
            onClick={() => setShowDeleteDialog(true)}
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
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                Connection
                <Tooltip content="Copy this address to connect to your server in Minecraft" />
              </dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-900 font-mono">
                  {server.host?.ipAddress}:{server.port}
                </span>
                <button
                  onClick={() => copyToClipboard(`${server.host?.ipAddress}:${server.port}`)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Players</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {server.stats?.onlinePlayers || 0}/{server.maxPlayers}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                Allocated RAM
                <Tooltip content="Memory allocated to your server. More RAM supports more players and mods" />
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {server.allocatedRam / 1024} GB
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                Allocated CPU
                <Tooltip content="CPU cores dedicated to your server. More cores = better performance" />
              </dt>
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
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                💡 Small changes can be applied instantly. Large changes may require a brief restart (3-5 seconds).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  RAM (Memory)
                  <Tooltip content="More RAM allows your server to handle more players and mods without lag" />
                </label>
                <select
                  value={newRam}
                  onChange={(e) => setNewRam(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                >
                  <option value="1024">1 GB - Small (1-5 players)</option>
                  <option value="2048">2 GB - Medium (5-10 players)</option>
                  <option value="4096">4 GB - Large (10-20 players)</option>
                  <option value="8192">8 GB - Very Large (20-50 players)</option>
                  <option value="16384">16 GB - Huge (50+ players or heavy mods)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  CPU Cores
                  <Tooltip content="More CPU cores improve performance for plugins, mods, and complex redstone contraptions" />
                </label>
                <select
                  value={newCpu}
                  onChange={(e) => setNewCpu(parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                >
                  <option value="0.5">0.5 Cores - Basic</option>
                  <option value="1">1 Core - Standard</option>
                  <option value="2">2 Cores - Performance</option>
                  <option value="4">4 Cores - High Performance</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowResourceModal(false)}
                disabled={updateResourcesMutation.isPending}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateResourcesMutation.mutate({ allocatedRam: newRam, allocatedCpu: newCpu })}
                disabled={updateResourcesMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-minecraft-grass hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {updateResourcesMutation.isPending && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Update Resources
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Server"
        message={`Are you sure you want to delete "${server?.name}"? All server data, worlds, and configurations will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Server"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Stop Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showStopDialog}
        onClose={() => setShowStopDialog(false)}
        onConfirm={() => stopMutation.mutate()}
        title="Stop Server"
        message={`Are you sure you want to stop "${server?.name}"? All players will be disconnected.`}
        confirmText="Stop Server"
        confirmVariant="warning"
        isLoading={stopMutation.isPending}
      />
    </div>
  );
}
