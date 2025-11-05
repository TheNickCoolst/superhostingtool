import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Tooltip from '../components/Tooltip';

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

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Server name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Server name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Server name must be less than 50 characters';
    }

    if (!formData.minecraftVersion) {
      newErrors.minecraftVersion = 'Please select a Minecraft version';
    }

    if (formData.maxPlayers < 1) {
      newErrors.maxPlayers = 'At least 1 player must be allowed';
    } else if (formData.maxPlayers > 1000) {
      newErrors.maxPlayers = 'Maximum 1000 players allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Server erstellen
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/servers', data),
    onSuccess: () => {
      toast.success('Server created successfully! 🎉');
      navigate('/servers');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create server');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="px-4 py-6">
      <Toaster position="top-right" />
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/servers')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Servers
        </button>
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create New Minecraft Server
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Set up your server in minutes! Fill in the details below to create a fully configured Minecraft server.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Server Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                Server Name
                <Tooltip content="Choose a memorable name for your server. This will be visible to your players." />
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-minecraft-grass focus:ring-minecraft-grass'
                }`}
                placeholder="My Awesome Server"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Minecraft Version */}
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                Minecraft Version
                <Tooltip content="Select the Minecraft version you want to run. Players need the same version to connect." />
              </label>
              <select
                required
                value={formData.minecraftVersion}
                onChange={(e) => {
                  setFormData({ ...formData, minecraftVersion: e.target.value });
                  if (errors.minecraftVersion) setErrors({ ...errors, minecraftVersion: '' });
                }}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${
                  errors.minecraftVersion
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-minecraft-grass focus:ring-minecraft-grass'
                }`}
              >
                <option value="">Select Version</option>
                {versions?.slice(0, 20).map((v: any) => (
                  <option key={v.id} value={v.version}>
                    {v.version} {v.type !== 'VANILLA' && `(${v.type})`}
                  </option>
                ))}
              </select>
              {errors.minecraftVersion && (
                <p className="mt-1 text-sm text-red-600">{errors.minecraftVersion}</p>
              )}
            </div>

            {/* Version Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                Server Type
                <Tooltip content="Vanilla = Pure Minecraft | Forge/Fabric = Mods | Paper/Spigot = Plugins & Performance" />
              </label>
              <select
                value={formData.versionType}
                onChange={(e) => setFormData({ ...formData, versionType: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border"
              >
                <option value="VANILLA">Vanilla - Pure Minecraft Experience</option>
                <option value="FORGE">Forge - For Mods</option>
                <option value="FABRIC">Fabric - Lightweight Mods</option>
                <option value="PAPER">Paper - Optimized Performance</option>
                <option value="SPIGOT">Spigot - Plugins Support</option>
              </select>
            </div>

            {/* Resources */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Server Resources</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    RAM (Memory)
                    <Tooltip content="More RAM = better performance with more players and mods. Start small and scale up!" />
                  </label>
                  <select
                    value={formData.allocatedRam}
                    onChange={(e) => setFormData({ ...formData, allocatedRam: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border bg-white"
                  >
                    <option value="1024">1 GB - Small (1-5 players)</option>
                    <option value="2048">2 GB - Medium (5-10 players) ⭐</option>
                    <option value="4096">4 GB - Large (10-20 players)</option>
                    <option value="8192">8 GB - Very Large (20-50 players)</option>
                    <option value="16384">16 GB - Huge (50+ or heavy mods)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    CPU Cores
                    <Tooltip content="CPU cores handle game logic, plugins, and mods. More cores = smoother gameplay!" />
                  </label>
                  <select
                    value={formData.allocatedCpu}
                    onChange={(e) => setFormData({ ...formData, allocatedCpu: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border bg-white"
                  >
                    <option value="0.5">0.5 Cores - Basic</option>
                    <option value="1">1 Core - Standard ⭐</option>
                    <option value="2">2 Cores - Performance</option>
                    <option value="4">4 Cores - High Performance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Game Settings */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Game Settings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    Max Players
                    <Tooltip content="Maximum number of players allowed on your server at once" />
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxPlayers}
                    onChange={(e) => {
                      setFormData({ ...formData, maxPlayers: parseInt(e.target.value) || 1 });
                      if (errors.maxPlayers) setErrors({ ...errors, maxPlayers: '' });
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border bg-white ${
                      errors.maxPlayers
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-minecraft-grass focus:ring-minecraft-grass'
                    }`}
                  />
                  {errors.maxPlayers && (
                    <p className="mt-1 text-xs text-red-600">{errors.maxPlayers}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    Difficulty
                    <Tooltip content="Game difficulty: affects monster damage, hunger, and more" />
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border bg-white"
                  >
                    <option value="PEACEFUL">Peaceful 🕊️</option>
                    <option value="EASY">Easy 😊</option>
                    <option value="NORMAL">Normal ⚔️</option>
                    <option value="HARD">Hard 💀</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    Game Mode
                    <Tooltip content="Default game mode for new players joining your server" />
                  </label>
                  <select
                    value={formData.gameMode}
                    onChange={(e) => setFormData({ ...formData, gameMode: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-minecraft-grass focus:ring-minecraft-grass sm:text-sm p-2 border bg-white"
                  >
                    <option value="SURVIVAL">Survival 🌲</option>
                    <option value="CREATIVE">Creative ✨</option>
                    <option value="ADVENTURE">Adventure 🗺️</option>
                    <option value="SPECTATOR">Spectator 👻</option>
                  </select>
                </div>
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
