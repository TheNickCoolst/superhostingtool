import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Users,
  Settings,
  Shield,
  Zap,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const adminSteps = [
    {
      title: 'Willkommen, Administrator!',
      icon: Shield,
      description: 'Sie haben erfolgreich Ihr Administrator-Konto erstellt. Sie haben vollen Zugriff auf alle Funktionen der SuperHostingTool-Plattform.',
      content: (
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Ihre Admin-Privilegien:</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <ChevronRight className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Unbegrenzte Server-Erstellung (999 Server)</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Benutzerverwaltung und Rollenzuweisung</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>System-Einstellungen und Konfiguration</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Zugriff auf alle Server und Ressourcen</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'Server erstellen und verwalten',
      icon: Server,
      description: 'Erstellen Sie Minecraft-Server mit nur wenigen Klicks und verwalten Sie diese zentral.',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 p-3 rounded-lg">
              <Server className="w-8 h-8 text-minecraft-grass mb-2" />
              <h5 className="font-semibold text-sm mb-1">Server erstellen</h5>
              <p className="text-xs text-gray-600">Wählen Sie Version, RAM und CPU für Ihre Server</p>
            </div>
            <div className="border border-gray-200 p-3 rounded-lg">
              <Zap className="w-8 h-8 text-yellow-500 mb-2" />
              <h5 className="font-semibold text-sm mb-1">Start/Stop</h5>
              <p className="text-xs text-gray-600">Starten und stoppen Sie Server mit einem Klick</p>
            </div>
            <div className="border border-gray-200 p-3 rounded-lg">
              <Settings className="w-8 h-8 text-blue-500 mb-2" />
              <h5 className="font-semibold text-sm mb-1">Konfiguration</h5>
              <p className="text-xs text-gray-600">Passen Sie Server-Einstellungen individuell an</p>
            </div>
            <div className="border border-gray-200 p-3 rounded-lg">
              <BookOpen className="w-8 h-8 text-purple-500 mb-2" />
              <h5 className="font-semibold text-sm mb-1">Logs & Konsole</h5>
              <p className="text-xs text-gray-600">Überwachen Sie Server in Echtzeit</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Benutzerverwaltung',
      icon: Users,
      description: 'Verwalten Sie Benutzer und deren Zugriff auf Server und Funktionen.',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Als Administrator können Sie neue Benutzer einladen und verwalten:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center text-sm">
              <div className="w-20 font-semibold text-gray-700">USER:</div>
              <div className="text-gray-600">Kann bis zu 9 Server erstellen</div>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-20 font-semibold text-gray-700">MODERATOR:</div>
              <div className="text-gray-600">Erweiterte Berechtigungen</div>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-20 font-semibold text-gray-700">ADMIN:</div>
              <div className="text-gray-600">Volle Kontrolle (unbegrenzt)</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              💡 <strong>Tipp:</strong> Neue Benutzer können sich selbst registrieren und werden automatisch als "USER" angelegt.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Los geht\'s!',
      icon: Zap,
      description: 'Sie sind bereit! Erstellen Sie jetzt Ihren ersten Minecraft-Server.',
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-minecraft-grass to-green-600 p-6 rounded-lg text-white">
            <h4 className="text-lg font-bold mb-2">Ihr erster Server</h4>
            <p className="text-sm opacity-90 mb-4">
              Klicken Sie auf den Button unten, um Ihren ersten Minecraft-Server zu erstellen und die Plattform zu erkunden.
            </p>
            <button
              onClick={() => {
                onComplete();
                navigate('/servers/create');
              }}
              className="bg-white text-minecraft-grass px-4 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors"
            >
              Ersten Server erstellen
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold mb-1">📚 Dokumentation</p>
              <p className="text-gray-600">Detaillierte Anleitungen verfügbar</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold mb-1">🛠️ Support</p>
              <p className="text-gray-600">Hilfe bei Problemen</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const userSteps = [
    {
      title: 'Willkommen!',
      icon: BookOpen,
      description: 'Herzlich willkommen bei SuperHostingTool! Erstellen und verwalten Sie Ihre Minecraft-Server ganz einfach.',
      content: (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-minecraft-grass to-green-600 p-4 rounded-lg text-white">
            <h4 className="font-semibold mb-2">Was ist SuperHostingTool?</h4>
            <p className="text-sm opacity-90">
              Eine leistungsstarke Plattform zur Verwaltung von Minecraft-Servern.
              Erstellen Sie Server, konfigurieren Sie Einstellungen und überwachen Sie
              alles an einem zentralen Ort.
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-semibold text-blue-900 mb-2">Ihre Möglichkeiten:</h5>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 mr-2" />
                Bis zu 9 Minecraft-Server erstellen
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 mr-2" />
                Server starten, stoppen und überwachen
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 mr-2" />
                Konfigurationen anpassen
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-4 h-4 mr-2" />
                Echtzeit-Logs und Konsole
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'Ihren ersten Server erstellen',
      icon: Server,
      description: 'In wenigen Schritten zu Ihrem eigenen Minecraft-Server.',
      content: (
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-start p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-minecraft-grass text-white rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                1
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Server-Details eingeben</h5>
                <p className="text-xs text-gray-600">Name, Beschreibung und Minecraft-Version wählen</p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-minecraft-grass text-white rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                2
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Ressourcen zuweisen</h5>
                <p className="text-xs text-gray-600">RAM und CPU-Kerne für optimale Performance</p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-minecraft-grass text-white rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                3
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Server erstellen</h5>
                <p className="text-xs text-gray-600">System richtet automatisch alles ein</p>
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-800">
              ✨ <strong>Tipp:</strong> Starten Sie mit 2-4 GB RAM für einen Standard-Server.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Server verwalten',
      icon: Settings,
      description: 'Steuern und überwachen Sie Ihre Server einfach und effizient.',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 border border-gray-200 rounded-lg">
              <Zap className="w-6 h-6 text-yellow-500 mb-2" />
              <h5 className="font-semibold text-xs mb-1">Start/Stop</h5>
              <p className="text-xs text-gray-600">Server mit einem Klick kontrollieren</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-500 mb-2" />
              <h5 className="font-semibold text-xs mb-1">Konsole</h5>
              <p className="text-xs text-gray-600">Befehle direkt ausführen</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <Settings className="w-6 h-6 text-gray-500 mb-2" />
              <h5 className="font-semibold text-xs mb-1">Einstellungen</h5>
              <p className="text-xs text-gray-600">Server konfigurieren</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <Server className="w-6 h-6 text-purple-500 mb-2" />
              <h5 className="font-semibold text-xs mb-1">Status</h5>
              <p className="text-xs text-gray-600">Echtzeit-Überwachung</p>
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-700">
              <strong>Dashboard:</strong> Behalten Sie den Überblick über alle Ihre Server,
              Ressourcen und Status auf einen Blick.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Bereit zum Start!',
      icon: Zap,
      description: 'Sie sind jetzt bereit, Ihren ersten Minecraft-Server zu erstellen!',
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-minecraft-grass to-green-600 p-6 rounded-lg text-white">
            <h4 className="text-lg font-bold mb-2">Jetzt loslegen!</h4>
            <p className="text-sm opacity-90 mb-4">
              Klicken Sie auf den Button, um Ihren ersten Minecraft-Server zu erstellen
              und mit Freunden zu spielen!
            </p>
            <button
              onClick={() => {
                onComplete();
                navigate('/servers/create');
              }}
              className="bg-white text-minecraft-grass px-4 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors"
            >
              Server erstellen
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={() => {
                onComplete();
                navigate('/');
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Oder zum Dashboard gehen →
            </button>
          </div>
        </div>
      )
    }
  ];

  const steps = isAdmin ? adminSteps : userSteps;
  const step = steps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-minecraft-grass rounded-lg flex items-center justify-center mr-4">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Überspringen"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step.content}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {/* Progress dots */}
          <div className="flex justify-center mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                  index === currentStep ? 'bg-minecraft-grass' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Zurück
            </button>

            <span className="text-sm text-gray-600">
              {currentStep + 1} / {steps.length}
            </span>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-minecraft-grass rounded-md hover:bg-green-700 transition-colors"
              >
                Weiter
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-minecraft-grass rounded-md hover:bg-green-700 transition-colors"
              >
                Fertig
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
