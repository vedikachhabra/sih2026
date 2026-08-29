import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';
import AlertsPage from './pages/AlertsPage';
import CarePlansPage from './pages/CarePlansPage';
import ReportsPage from './pages/ReportsPage';
import LiveSyncSimulator from './components/LiveSyncSimulator';
import RegisterPatientModal from './components/RegisterPatientModal';
import { fetchPatients, fetchAlerts, fetchCognitiveTrends } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTrends, setActiveTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const loadAllData = async () => {
    try {
      const [patientsData, alertsData] = await Promise.all([
        fetchPatients(),
        fetchAlerts()
      ]);
      setPatients(patientsData);
      setAlerts(alertsData);

      const targetId = selectedPatientId || (patientsData.length > 0 ? patientsData[0].id : null);
      if (targetId) {
        const trendsData = await fetchCognitiveTrends(targetId, 30);
        setActiveTrends(trendsData);
      }
    } catch (err) {
      console.error("Failed to load clinical portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Auto-poll every 3 seconds for live real-time sync with patient app
    const interval = setInterval(() => {
      loadAllData();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedPatientId]);

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    setCurrentTab('patients');
  };

  const handleSyncComplete = async () => {
    await loadAllData();
  };

  const handlePatientRegistered = async (newPatient) => {
    await loadAllData();
    setSelectedPatientId(newPatient.id);
    setCurrentTab('patients');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
      <Header activeAlertCount={alerts.filter(a => !a.acknowledged).length} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          setTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'patients') setSelectedPatientId(null);
          }}
          alertCount={alerts.filter(a => !a.acknowledged).length}
        />

        <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="h-96 flex items-center justify-center text-teal-400 font-bold">
              Connecting to Cognitive Care REST Engine...
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <Dashboard
                  patients={patients}
                  alerts={alerts}
                  onSelectPatient={handleSelectPatient}
                  activeTrends={activeTrends}
                  onOpenRegister={() => setIsRegisterModalOpen(true)}
                />
              )}

              {currentTab === 'patients' && (
                <PatientDetail
                  patientId={selectedPatientId || patients[0]?.id}
                  onBack={() => {
                    setSelectedPatientId(null);
                    setCurrentTab('dashboard');
                  }}
                />
              )}

              {currentTab === 'alerts' && (
                <AlertsPage alerts={alerts} onRefresh={loadAllData} />
              )}

              {currentTab === 'careplans' && (
                <CarePlansPage patients={patients} onRefresh={loadAllData} />
              )}

              {currentTab === 'reports' && (
                <ReportsPage patients={patients} />
              )}

              {currentTab === 'simulator' && (
                <LiveSyncSimulator onSyncCompleted={handleSyncComplete} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Patient Registration Modal */}
      <RegisterPatientModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onPatientRegistered={handlePatientRegistered}
      />
    </div>
  );
}

