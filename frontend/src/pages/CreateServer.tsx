import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Loader2 } from 'lucide-react';

/**
 * ONE-CLICK SERVER CREATION
 * Ermöglicht das Erstellen eines komplett konfigurierten Servers mit einem Klick
 */
export default function CreateServer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    minecraftVersion: '',
    versionType: 'VANILLA',
    allocatedRam: 2048,
    allocatedCpu: 1,
    maxPlayers: 20,
    difficulty: 'NORMAL',
    gameMode: 'SURVIVAL'
  });

  // Hole verfügbare Minecraft-Versionen
  const { data: versions } = useQuery({
    queryKey: ['versions'],
    queryFn: () => api.get('/api/versions').then(res => res.data.versions)
  });

  // Server erstellen
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/servers', data),
    onSuccess: () => {
      navigate('/servers');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Create New Minecraft Server
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Server Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Server Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                placeholder="My Awesome Server"
              />
            </div>

            {/* Minecraft Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Minecraft Version
              </label>
              <select
                required
                value={formData.minecraftVersion}
                onChange={(e) => setFormData({ ...formData, minecraftVersion: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
              >
                <option value="">Select Version</option>
                {versions?.slice(0, 20).map((v: any) => (
                  <option key={v.id} value={v.version}>
                    {v.version} {v.type !== 'VANILLA' && `(${v.type})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Version Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Server Type
              </label>
              <select
                value={formData.versionType}
                onChange={(e) => setFormData({ ...formData, versionType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
              >
                <option value="VANILLA">Vanilla</option>
                <option value="FORGE">Forge (Modded)</option>
                <option value="FABRIC">Fabric (Modded)</option>
                <option value="PAPER">Paper (Optimized)</option>
                <option value="SPIGOT">Spigot (Plugins)</option>
              </select>
            </div>

            {/* Resources */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  RAM (MB)
                </label>
                <select
                  value={formData.allocatedRam}
                  onChange={(e) => setFormData({ ...formData, allocatedRam: parseInt(e.target.value) })}
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
                  value={formData.allocatedCpu}
                  onChange={(e) => setFormData({ ...formData, allocatedCpu: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                >
                  <option value="0.5">0.5 Cores</option>
                  <option value="1">1 Core</option>
                  <option value="2">2 Cores</option>
                  <option value="4">4 Cores</option>
                </select>
              </div>
            </div>

            {/* Game Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Players
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxPlayers}
                  onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                >
                  <option value="PEACEFUL">Peaceful</option>
                  <option value="EASY">Easy</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Game Mode
                </label>
                <select
                  value={formData.gameMode}
                  onChange={(e) => setFormData({ ...formData, gameMode: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
                >
                  <option value="SURVIVAL">Survival</option>
                  <option value="CREATIVE">Creative</option>
                  <option value="ADVENTURE">Adventure</option>
                  <option value="SPECTATOR">Spectator</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/servers')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-minecraft-grass hover:bg-green-700 focus:outline-none disabled:opacity-50 flex items-center"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Create Server
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
