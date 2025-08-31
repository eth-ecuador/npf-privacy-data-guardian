"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { contractAddress, contractABI } from "../../lib/contract";

// --- Tipos para organizar los datos ---
type PatientInfo = {
  foundation: string;
  timestamp: string;
  diseaseCount: string;
};

type Disease = [string[], ...unknown[]];
type SelectedPatient = {
  address: string;
  info: PatientInfo | null;
  patientId: string | null;
  name: { data: string[], length: string } | null;
  diseases: Disease[];
};

// --- Constantes de la Red ---
const SEPOLIA_CHAIN_ID_DEC = 11155111;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

export default function HomePage() {
  // --- Estados Generales ---
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Estados del Dashboard ---
  const [totalPatients, setTotalPatients] = useState<string>("0");
  const [owner, setOwner] = useState<string>("-");
  const [patientAddresses, setPatientAddresses] = useState<string[]>([]);
  
  // --- Estados del Paciente Seleccionado ---
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [isPatientLoading, setIsPatientLoading] = useState(false);

  // --- Estados de las Herramientas de Verificación ---
  const [verifyAddress, setVerifyAddress] = useState("");
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // --- 1. INICIALIZACIÓN Y CARGA DE DATOS GLOBALES ---
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window.ethereum === "undefined") {
          throw new Error("MetaMask no está instalado.");
        }
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== SEPOLIA_CHAIN_ID_DEC) {
           await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
            });
           // Es buena idea recargar para asegurar que todo se actualiza con la nueva red
           window.location.reload();
           return;
        }

        const contractInstance = new ethers.Contract(contractAddress, contractABI, provider);
        setContract(contractInstance);

        // Cargar datos del dashboard en paralelo
        const [ownerAddress, total] = await Promise.all([
            contractInstance.owner(),
            contractInstance.getTotalPatients()
        ]);

        setOwner(ownerAddress);
        const totalNum = Number(total);
        setTotalPatients(totalNum.toString());

        // Cargar la lista de direcciones de pacientes
        if (totalNum > 0) {
            const addressesPromises = [];
            for (let i = 0; i < totalNum; i++) {
                addressesPromises.push(contractInstance.registeredPatients(i));
            }
            const addresses = await Promise.all(addressesPromises);
            setPatientAddresses(addresses);
        }

      } catch (err) {
        const e = err as { message?: string };
        setError(e?.message ?? "Ocurrió un error al cargar los datos.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- 2. MANEJADOR PARA SELECCIONAR Y CARGAR DETALLES DE UN PACIENTE ---
  const handleSelectPatient = useCallback(async (address: string) => {
    if (!contract) return;

    setIsPatientLoading(true);
    setSelectedPatient({ address, info: null, patientId: null, name: null, diseases: [] }); // Resetea con la nueva dirección

    try {
        // Obtener la información principal en paralelo
        const [info, patientId, name] = await Promise.all([
            contract.getPatientInfo(address),
            contract.getPatientId(address),
            contract.getPatientName(address)
        ]);
        
        const formattedInfo: PatientInfo = {
            foundation: info[0],
            timestamp: new Date(Number(info[1]) * 1000).toLocaleString(),
            diseaseCount: info[2].toString()
        };
        
        const formattedName = {
            data: name[0], // Array de bytes32
            length: name[1].toString()
        };

        // Cargar las enfermedades si existen
        let diseasesData = [];
        const diseaseCountNum = Number(formattedInfo.diseaseCount);
        if (diseaseCountNum > 0) {
            const diseasePromises = [];
            for (let i = 0; i < diseaseCountNum; i++) {
                diseasePromises.push(contract.getPatientDisease(address, i));
            }
            diseasesData = await Promise.all(diseasePromises);
        }
        
        setSelectedPatient({
            address,
            info: formattedInfo,
            patientId,
            name: formattedName,
            diseases: diseasesData
        });

    } catch (err) {
        console.error("Error al cargar datos del paciente:", err);
        // Podrías añadir un estado de error específico para el paciente
    } finally {
        setIsPatientLoading(false);
    }
  }, [contract]);

  // --- 3. MANEJADOR PARA LA HERRAMIENTA DE VERIFICACIÓN ---
  const handleVerifyPatient = async () => {
      if (!contract || !verifyAddress) {
          setVerifyResult("Por favor, introduce una dirección.");
          return;
      }
      setIsVerifying(true);
      setVerifyResult(null);
      try {
          const isRegistered = await contract.isPatientRegistered(verifyAddress);
          setVerifyResult(isRegistered ? "✅ Registrado" : "❌ No Registrado");
      } catch (err) {
          setVerifyResult("Error al verificar.");
      } finally {
          setIsVerifying(false);
      }
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Cargando Dashboard...</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-gray-900 text-red-400 flex items-center justify-center">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Dashboard del Contrato</h1>
          <p className="text-gray-400">Leyendo datos desde la red Sepolia. Conectado como: <span className="font-mono text-sm">{account}</span></p>
        </header>

        {/* Componente 1: Panel Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <p className="text-gray-400 text-sm">Total de Pacientes</p>
                <p className="text-4xl font-semibold text-white">{totalPatients}</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <p className="text-gray-400 text-sm">Dueño del Contrato</p>
                <p className="text-lg font-mono break-words text-cyan-400">{owner}</p>
            </div>
        </div>

        {/* Layout Principal: Lista y Detalles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Componente 2: Lista Maestra de Pacientes */}
          <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Pacientes Registrados</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {patientAddresses.length > 0 ? (
                    patientAddresses.map((addr, index) => (
                        <button key={index} onClick={() => handleSelectPatient(addr)} className="w-full text-left p-3 bg-gray-700 rounded-md hover:bg-cyan-600 transition-colors focus:ring-2 focus:ring-cyan-400 font-mono text-sm truncate">
                            {addr}
                        </button>
                    ))
                ) : <p className="text-gray-500">No hay pacientes registrados.</p>}
            </div>
          </div>
          
          {/* Componente 3 y 4: Vista Detallada y Herramientas */}
          <div className="lg:col-span-2 space-y-8">
            {/* Componente 3: Vista Detallada */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg min-h-[20rem]">
                <h2 className="text-2xl font-bold mb-4">Detalles del Paciente</h2>
                {isPatientLoading ? <p>Cargando información...</p> : 
                 !selectedPatient ? <p className="text-gray-500">Selecciona un paciente de la lista para ver sus detalles.</p> : (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-cyan-400">Información General</h3>
                            <p><strong>Dirección:</strong> <span className="font-mono text-sm">{selectedPatient.address}</span></p>
                            <p><strong>Registrado por:</strong> <span className="font-mono text-sm">{selectedPatient.info?.foundation}</span></p>
                            <p><strong>Fecha de Registro:</strong> {selectedPatient.info?.timestamp}</p>
                            <p><strong>Total de Enfermedades:</strong> {selectedPatient.info?.diseaseCount}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-cyan-400">Datos Encriptados</h3>
                            <p className="break-all"><strong>ID Paciente:</strong> <span className="font-mono text-xs text-gray-400">{selectedPatient.patientId}</span></p>
                            <p className="break-all"><strong>Nombre (bytes):</strong> <span className="font-mono text-xs text-gray-400">{selectedPatient.name?.data.join(', ')}</span></p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-cyan-400">Enfermedades Registradas ({selectedPatient.diseases.length})</h3>
                            {selectedPatient.diseases.length > 0 ? (
                                <div className="text-xs font-mono text-gray-400 space-y-1">
                                    {selectedPatient.diseases.map((d, i) => <p key={i} className="break-all">{`[${i}]: ${d[0].join(', ')}`}</p>)}
                                </div>
                            ) : <p className="text-gray-500">Sin enfermedades registradas.</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Componente 4: Herramientas de Verificación */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Herramientas de Verificación</h2>
                <div>
                    <label htmlFor="verifyAddr" className="block text-sm font-medium text-gray-300">Verificar si paciente está registrado</label>
                    <div className="mt-1 flex gap-2">
                        <input type="text" id="verifyAddr" value={verifyAddress} onChange={e => setVerifyAddress(e.target.value)} placeholder="0x..." className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-2 text-white font-mono text-sm"/>
                        <button onClick={handleVerifyPatient} disabled={isVerifying} className="bg-cyan-600 px-4 py-2 rounded-md hover:bg-cyan-700 disabled:bg-gray-500">{isVerifying ? "..." : "Verificar"}</button>
                    </div>
                    {verifyResult && <p className="mt-2 text-lg">{verifyResult}</p>}
                </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}