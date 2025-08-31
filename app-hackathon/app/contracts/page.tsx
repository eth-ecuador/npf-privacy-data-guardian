"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

// UI Components (shadcn/ui)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, 
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Copy, Check } from "lucide-react";

// --- TypeScript Types ---
type PatientInfo = {
  name: string;
  foundation: string;
  timestamp: string;
  diseaseCount: string;
};
type DiseaseRecord = [string[], ...unknown[]];
type SelectedPatient = {
  address: string;
  info: PatientInfo | null;
  patientId: string | null;
  diseases: DiseaseRecord[];
};

// --- Presentational Data for Charts ---
const diseaseData = [
  { name: 'Diabetes', count: 189 }, { name: 'Hypertension', count: 245 }, { name: 'Asthma', count: 120 },
  { name: 'Cancer', count: 45 }, { name: 'Heart Disease', count: 150 }, { name: 'Tuberculosis', count: 30 },
  { name: 'HIV', count: 22 }, { name: 'Covid-19', count: 310 }, { name: 'Arthritis', count: 98 }, { name: 'Depression', count: 115 },
];
const recordsOverTimeData = [
  { name: 'Week 1', uploads: 20 }, { name: 'Week 2', uploads: 35 }, { name: 'Week 3', uploads: 28 },
  { name: 'Week 4', uploads: 42 }, { name: 'Week 5', uploads: 50 }, { name: 'Week 6', uploads: 45 },
];
const permissionsData = [ { name: 'Granted', value: 485 }, { name: 'Pending', value: 62 }, ];
const PERMISSION_COLORS = ['#1a70fe', '#bac0ca'];
const recentActivityData = [
    { date: '2025-08-30', action: 'Added Person', id: 'PID-84321', status: 'Completed' },
    { date: '2025-08-30', action: 'Granted Access', id: '0x12...aB56', status: 'Granted' },
    { date: '2025-08-29', action: 'Uploaded', id: 'CID-fa...3e1', status: 'Completed' },
];

// Styles are embedded here to keep it in a single file
const PageStyles = () => (
  <style>{`
    :root {
      --background: #ffffff; --surface-1: #f3f9fe; --surface-2: #e8effb; --border-1: #dfe6f1;
      --border-2: #bac0ca; --text-primary: #141a21; --text-muted: #5a6876;
      --accent: #1a70fe; --contrast: #0e0f15;
    }
    body { background-color: var(--background); }
    .dashboardContainer { background-color: var(--background); color: var(--text-primary); min-height: 100vh; }
    .mainContent { max-width: 1280px; margin: 0 auto; padding: 2rem; }
    .hero { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-1); }
    .heroTitle { font-size: 2.25rem; font-weight: 700; color: var(--contrast); }
    .walletInfo { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; color: var(--text-muted); }
    .walletLabel { font-size: 0.875rem; }
    .walletAddress { font-family: monospace; background-color: var(--surface-1); padding: 0.25rem 0.5rem; border-radius: 0.375rem; color: var(--text-primary); }
    .copyButton { color: var(--text-muted); }
    .copyButton:hover { color: var(--accent); }
    .sectionTitle { font-size: 1.5rem; font-weight: 600; margin-bottom: 1.5rem; color: var(--text-primary); }
    .kpiGrid { display: grid; grid-template-columns: repeat(1, 1fr); gap: 1.5rem; }
    @media (min-width: 640px) { .kpiGrid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .kpiGrid { grid-template-columns: repeat(4, 1fr); } }
    .kpiValue { font-size: 2.5rem; font-weight: 700; color: var(--contrast); }
    .chartContainer { margin-top: 1rem; padding: 1.5rem; background-color: var(--surface-1); border: 1px solid var(--border-1); border-radius: 0.75rem; }
    .patient-list-scroll { max-height: 24rem; /* 384px */ overflow-y: auto; }
    .detail-item { display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-1); }
    .detail-item:last-child { border-bottom: none; }
    .detail-label { color: var(--text-muted); }
    .detail-value { font-weight: 500; font-family: monospace; font-size: 0.875rem; }
    .loadingScreen, .errorScreen { display: flex; align-items: center; justify-content: center; min-height: 100vh; font-size: 1.25rem; background-color: var(--surface-1); }
    .errorScreen { color: #ef4444; }
  `}</style>
);


// Main Component
export default function Page() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Dynamic Contract State ---
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [totalPersons, setTotalPersons] = useState("0");
  const [totalDiseases, setTotalDiseases] = useState("0");

  // --- Patient Management State ---
  const [patientAddresses, setPatientAddresses] = useState<string[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [isPatientLoading, setIsPatientLoading] = useState(false);
  const [verifyAddress, setVerifyAddress] = useState("");
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // --- UI State ---
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // --- Initial Data Load ---
  useEffect(() => {
    const storedWallet = localStorage.getItem("walletAddress");
    if (storedWallet) { setWalletAddress(storedWallet); } 
    else { router.push("/"); return; }

    const initEthers = async () => {
      try {
        if (typeof window.ethereum === "undefined") throw new Error("MetaMask is not installed.");
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        
        const contractAddress = "0x9467A74FA655590739e5c5b617D10c35f2F1a7c4"; 
  const contractABI: readonly object[] = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":true,"internalType":"address","name":"authorizedEntity","type":"address"}],"name":"AccessGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":true,"internalType":"address","name":"revokedEntity","type":"address"}],"name":"AccessRevoked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":true,"internalType":"address","name":"addedBy","type":"address"},{"indexed":false,"internalType":"uint256","name":"diseaseIndex","type":"uint256"}],"name":"DiseaseAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"foundation","type":"address"}],"name":"FoundationAuthorized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"foundation","type":"address"}],"name":"FoundationRevoked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"patient","type":"address"},{"indexed":true,"internalType":"address","name":"foundation","type":"address"},{"indexed":false,"internalType":"string","name":"name","type":"string"}],"name":"PatientRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"diseaseType","type":"string"},{"indexed":false,"internalType":"uint256","name":"newCount","type":"uint256"}],"name":"StatisticsUpdated","type":"event"},{"inputs":[{"internalType":"address","name":"patient","type":"address"},{"internalType":"externalEuint8[]","name":"diseaseData","type":"bytes32[]"},{"internalType":"uint256","name":"diseaseLength","type":"uint256"},{"internalType":"bytes","name":"inputProof","type":"bytes"}],"name":"addDisease","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"foundation","type":"address"}],"name":"authorizeFoundation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"authorizedAccess","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"authorizedFoundations","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"diseaseOccurrences","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"foundationPatientCounts","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllPatientNames","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"foundation","type":"address"}],"name":"getFoundationPatientCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"},{"internalType":"uint256","name":"diseaseIndex","type":"uint256"}],"name":"getPatientDisease","outputs":[{"internalType":"euint8[]","name":"data","type":"bytes32[]"},{"internalType":"uint256","name":"length","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"}],"name":"getPatientDiseaseCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"}],"name":"getPatientId","outputs":[{"internalType":"euint32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"}],"name":"getPatientInfo","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"address","name":"foundation","type":"address"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"diseaseCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"}],"name":"getPatientName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"startIndex","type":"uint256"},{"internalType":"uint256","name":"count","type":"uint256"}],"name":"getPatientRegistrationBatch","outputs":[{"internalType":"string[]","name":"names","type":"string[]"},{"internalType":"uint256[]","name":"timestamps","type":"uint256[]"},{"internalType":"address[]","name":"foundations","type":"address[]"},{"internalType":"uint256[]","name":"diseaseCounts","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"foundation","type":"address"}],"name":"getPatientsByFoundation","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"timeRangeSeconds","type":"uint256"}],"name":"getRegistrationTimeline","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getSystemStatistics","outputs":[{"internalType":"uint256","name":"totalPatients","type":"uint256"},{"internalType":"uint256","name":"totalDiseases","type":"uint256"},{"internalType":"uint256","name":"avgDiseasesPerPatient","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalPatients","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalRegistrations","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"authorizedEntity","type":"address"}],"name":"grantAccess","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"foundation","type":"address"}],"name":"isFoundationAuthorized","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"}],"name":"isPatientRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"patient","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"externalEuint32","name":"patientIdExternal","type":"bytes32"},{"internalType":"bytes","name":"inputProof","type":"bytes"}],"name":"registerPatient","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"registeredPatients","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"authorizedEntity","type":"address"}],"name":"revokeAccess","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"foundation","type":"address"}],"name":"revokeFoundation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalRegistrations","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
        const contractInstance = new ethers.Contract(contractAddress, contractABI, provider);
        setContract(contractInstance);

        const stats = await contractInstance.getSystemStatistics();
        const totalNum = Number(stats.totalPatients);
        setTotalPersons(totalNum.toString());
        setTotalDiseases(stats.totalDiseases.toString());

        if (totalNum > 0) {
            const addressesPromises = Array.from({ length: totalNum }, (_, i) => contractInstance.registeredPatients(i));
            const addresses = await Promise.all(addressesPromises);
            setPatientAddresses(addresses);
        }
      } catch (err: unknown) {
        console.error("Initialization error:", err);
        if (err instanceof Error) {
          setError(err.message || "Failed to connect.");
        } else if (typeof err === "object" && err !== null && "message" in err) {
          setError((err as { message?: string }).message || "Failed to connect.");
        } else {
          setError("Failed to connect.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    initEthers();
  }, [router]);

  // --- Handlers ---
  const handleGoHome = () => {
    router.push('/home');
  };

  const handleCopy = (address: string) => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };
  
  const handleSelectPatient = useCallback(async (address: string) => {
    if (!contract) return;
    setIsPatientLoading(true);
    setSelectedPatient(null);

    try {
        const results = await Promise.allSettled([
            contract.getPatientInfo(address),
            contract.getPatientId(address)
        ]);
        
        const infoResult = results[0];
        const patientIdResult = results[1];

        if (infoResult.status === 'rejected') {
            console.warn(`Owner authorization needed to view patient data for ${address}.`);
            setSelectedPatient({
                address,
                info: { name: "Access Denied", foundation: "N/A", timestamp: "-", diseaseCount: "N/A" },
                patientId: "Access Denied", diseases: []
            });
            return;
        }
        
        const info = infoResult.value;
        const formattedInfo: PatientInfo = {
            name: info.name,
            foundation: info.foundation,
            timestamp: new Date(Number(info.timestamp) * 1000).toLocaleString(),
            diseaseCount: info.diseaseCount.toString()
        };
        
        const patientId = patientIdResult.status === 'fulfilled' ? patientIdResult.value : "Access Denied";

        let diseasesData: DiseaseRecord[] = [];
        const diseaseCountNum = Number(formattedInfo.diseaseCount);
        if (diseaseCountNum > 0) {
           const promises = Array.from({ length: diseaseCountNum }, (_, i) => contract.getPatientDisease(address, i).catch(() => null));
           const settledDiseases = await Promise.all(promises);
           diseasesData = settledDiseases.filter(d => d !== null) as DiseaseRecord[];
        }
        
        setSelectedPatient({ address, info: formattedInfo, patientId, diseases: diseasesData });
    } finally {
        setIsPatientLoading(false);
    }
  }, [contract]);

  const handleVerifyPatient = useCallback(async () => {
      if (!contract || !verifyAddress) { setVerifyResult("Please enter an address."); return; }
      setIsVerifying(true);
      setVerifyResult(null);
      try {
          const isRegistered = await contract.isPatientRegistered(verifyAddress);
          setVerifyResult(isRegistered ? "✅ Registered" : "❌ Not Registered");
      } catch (err) {
          setVerifyResult("Error during verification.");
      } finally {
          setIsVerifying(false);
      }
  }, [contract, verifyAddress]);

  const handleRequestData = () => {
    setIsAlertOpen(true);
  };

  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (isLoading) { return <div className="loadingScreen">Connecting...</div>; }
  if (error) { return <div className="errorScreen">Error: {error}</div>; }

  return (
    <>
      <PageStyles />
      <div className="dashboardContainer">
        <main className="mainContent">
          <div className="hero">
            <div>
              <h1 className="heroTitle">Welcome, Guardian</h1>
              {walletAddress && (
                <div className="walletInfo">
                  <span className="walletLabel">Your Wallet:</span>
                  <span className="walletAddress">{truncateAddress(walletAddress)}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleCopy(walletAddress)} className="copyButton">
                    {copiedAddress === walletAddress ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
            <Button onClick={handleGoHome}>Go Back to Home</Button>
          </div>

          <section>
            <h2 className="sectionTitle">Analytics & Insights</h2>
            <div className="kpiGrid">
              <Card><CardHeader><CardTitle>Total Persons</CardTitle></CardHeader><CardContent className="kpiValue">{totalPersons}</CardContent></Card>
              <Card><CardHeader><CardTitle>Encrypted Records</CardTitle></CardHeader><CardContent className="kpiValue">1,284</CardContent></Card>
              <Card><CardHeader><CardTitle>Diseases Tracked</CardTitle></CardHeader><CardContent className="kpiValue">{totalDiseases}</CardContent></Card>
              <Card><CardHeader><CardTitle>Last Analysis</CardTitle></CardHeader><CardContent className="kpiValue">{new Date().toLocaleDateString()}</CardContent></Card>
            </div>

            <Tabs defaultValue="prevalence" className="mt-8">
              <TabsList>
                <TabsTrigger value="prevalence">Disease Prevalence</TabsTrigger>
                <TabsTrigger value="overTime">Records Over Time</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="prevalence" className="chartContainer">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={diseaseData}><CartesianGrid strokeDasharray="3 3" stroke="#dfe6f1" /><XAxis dataKey="name" stroke="#5a6876" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#5a6876" fontSize={12} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dfe6f1' }} /><Bar dataKey="count" fill="#1a70fe" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="overTime" className="chartContainer">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={recordsOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe6f1" />
                    <XAxis dataKey="name" stroke="#5a6876" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#5a6876" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dfe6f1' }} />
                    <Legend />
                    <Line type="monotone" dataKey="uploads" stroke="#1a70fe" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="permissions" className="chartContainer">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={permissionsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {permissionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PERMISSION_COLORS[index % PERMISSION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #dfe6f1' }} />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="activity" className="chartContainer">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivityData.map((row, idx) => (
                      <TableRow key={row.id + row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.action}</TableCell>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'Completed' ? 'default' : 'outline'} color={row.status === 'Granted' ? 'blue' : undefined}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </section>
          
          <section className="mt-12 pt-8 border-t border-[--border-1]">
             <h2 className="sectionTitle">Patient Management</h2>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader><CardTitle>Registered Patients</CardTitle><CardDescription>{patientAddresses.length} patients found</CardDescription></CardHeader>
                    <CardContent className="patient-list-scroll">
                        <div className="flex flex-col space-y-2">
                            {patientAddresses.length > 0 ? (
                                patientAddresses.map((addr, index) => (
                                    <Button key={index} variant="ghost" onClick={() => handleSelectPatient(addr)} className="w-full justify-start font-mono text-xs">
                                        {truncateAddress(addr)}
                                    </Button>
                                ))
                            ) : <p className="text-sm text-[--text-muted]">No registered patients found.</p>}
                        </div>
                    </CardContent>
                </Card>
                
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Patient Details</CardTitle></CardHeader>
                        <CardContent>
                            {isPatientLoading ? <p>Loading Information...</p> : 
                             !selectedPatient ? <p className="text-sm text-[--text-muted]">Select a patient from the list to see details.</p> : (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg text-[--accent]">{selectedPatient.info?.name}</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="detail-item">
                                            <span className="detail-label">Address</span>
                                            <div className="flex items-center gap-1">
                                                <span className="detail-value">{truncateAddress(selectedPatient.address)}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(selectedPatient.address)}>
                                                    {copiedAddress === selectedPatient.address ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="detail-item"><span className="detail-label">Registered By</span><span className="detail-value">{truncateAddress(selectedPatient.info?.foundation || 'N/A')}</span></div>
                                        <div className="detail-item"><span className="detail-label">Registration Date</span><span className="detail-value">{selectedPatient.info?.timestamp}</span></div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mt-4 mb-2">Encrypted Data</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="detail-item"><span className="detail-label">Patient ID</span><span className="detail-value break-all">{selectedPatient.patientId}</span></div>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-4 border-t border-[--border-1]">
                                        <Button variant="destructive" className="w-full" onClick={handleRequestData}>
                                            Request Private Data
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Verification Tools</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <label htmlFor="verifyAddr" className="text-sm font-medium">Verify Patient Registration</label>
                                <div className="flex gap-2">
                                    <Input id="verifyAddr" type="text" value={verifyAddress} onChange={e => setVerifyAddress(e.target.value)} placeholder="0x..." />
                                    <Button onClick={handleVerifyPatient} disabled={isVerifying}>{isVerifying ? "Verifying..." : "Verify"}</Button>
                                </div>
                                {verifyResult && <p className="mt-2 text-sm font-semibold">{verifyResult}</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
          </section>
        </main>
      </div>
      
      {/* Pop-up Dialog for Data Request */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Submitted</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPatient && `Your request for private data access for patient ${truncateAddress(selectedPatient.address)} has been sent.`}
              <br />
              You will be notified upon confirmation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}