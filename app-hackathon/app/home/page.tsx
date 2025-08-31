"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Copy, ExternalLink, FileText, Shield, Database, Eye, Play, HelpCircle, X } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

const diseases = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Cancer",
  "Heart Disease",
  "Tuberculosis",
  "HIV",
  "Covid-19",
  "Arthritis",
  "Depression",
]

export default function Dashboard() {
  const [isFormExpanded, setIsFormExpanded] = useState(false)
  const [idNumber, setIdNumber] = useState("")
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([])
  const [walletCopied, setWalletCopied] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [showHelpTooltip, setShowHelpTooltip] = useState(false)

  const [walletAddress, setWalletAddress] = useState<string>("")
  const router = useRouter()

  // Obtener el wallet del localStorage
  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("walletAddress")
      if (storedWallet) {
        setWalletAddress(storedWallet)
      }
    } catch {
      console.warn("No wallet in localStorage")
    }
  }, [])

  const handleDiseaseToggle = (disease: string) => {
    setSelectedDiseases((prev) =>
      prev.includes(disease) ? prev.filter((d) => d !== disease) : [...prev, disease]
    )
  }

  const handleSave = () => {
    console.log("Saving:", { idNumber, selectedDiseases })
    setIdNumber("")
    setSelectedDiseases([])
    setIsFormExpanded(false)
  }

  const handleCopyWallet = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setWalletCopied(true)
      setTimeout(() => setWalletCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy wallet address")
    }
  }

  const handleDisconnect = () => {
    try {
      localStorage.removeItem("walletAddress")
    } catch {}
    router.replace("/") // vuelve al onboarding
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f3f9fe" }}>
    {/* Header */}
    <header className="border-b bg-white border-[#e8effb]">
    <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#141a21]">
            Health Dashboard
        </h1>

        {/* Botón Disconnect con funcionalidad */}
        <button
            onClick={() => {
            try {
                localStorage.removeItem("walletAddress")
            } catch {}
            window.location.href = "/" // redirige al onboarding
            }}
            className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Disconnect"
        >
            Disconnect
        </button>
        </div>
    </div>
    </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Welcome Section */}
          <div className="space-y-4 animate-in fade-in duration-700">
            <h2 className="text-4xl font-bold text-balance" style={{ color: "#141a21" }}>
              Welcome, Guardian
            </h2>
            <div className="flex items-center space-x-3 group">
              <span className="text-lg" style={{ color: "#5a6876" }}>
                Your Wallet is:
              </span>
              <div className="flex items-center space-x-2">
                <code
                  className="px-3 py-1 rounded-md font-mono text-sm"
                  style={{ backgroundColor: "#e8effb", color: "#141a21" }}
                >
                  {walletAddress}
                </code>
                <Button
                  onClick={handleCopyWallet}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:scale-110 transition-all duration-200"
                  style={{ color: walletCopied ? "#FFD700" : "#1a70fe" }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {walletCopied && (
              <p className="text-sm animate-in fade-in duration-300" style={{ color: "#FFD700" }}>
                Wallet address copied to clipboard!
              </p>
            )}
          </div>

          {/* Help & Quick Guide */}
          <Card
            className="border shadow-lg animate-in slide-in-from-right duration-700"
            style={{ backgroundColor: "#ffffff", borderColor: "#e8effb" }}
          >
            <CardHeader>
              <CardTitle className="text-xl" style={{ color: "#141a21" }}>
                Help & Quick Guide
              </CardTitle>
              <p className="text-sm leading-relaxed" style={{ color: "#5a6876" }}>
                This dashboard helps you manage encrypted health archives, control on-chain permissions, and run
                privacy-preserving research.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="font-semibold text-sm" style={{ color: "#141a21" }}>
                  Next Steps:
                </h4>
                <div className="space-y-3">
                  <div
                    className="flex items-start space-x-3 group hover:bg-opacity-50 p-2 rounded-md transition-colors duration-200"
                    style={{ backgroundColor: "transparent" }}
                  >
                    <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#1a70fe" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                        Google Apps
                      </p>
                      <p className="text-xs" style={{ color: "#5a6876" }}>
                        Connect Google Drive to import/export supporting documents.
                      </p>
                      <a href="#" className="text-xs hover:underline" style={{ color: "#1a70fe" }}>
                        Learn more
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 group hover:bg-opacity-50 p-2 rounded-md transition-colors duration-200">
                    <Database className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#1a70fe" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                        Your Encrypted Archives
                      </p>
                      <p className="text-xs" style={{ color: "#5a6876" }}>
                        View, upload, and organize your encrypted data stored on chain.
                      </p>
                      <a href="#" className="text-xs hover:underline" style={{ color: "#1a70fe" }}>
                        Learn more
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 group hover:bg-opacity-50 p-2 rounded-md transition-colors duration-200">
                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#1a70fe" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                        Manage Files
                      </p>
                      <p className="text-xs" style={{ color: "#5a6876" }}>
                        Encrypt on the client, upload to the vault, and track CIDs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 group hover:bg-opacity-50 p-2 rounded-md transition-colors duration-200">
                    <Eye className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#1a70fe" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                        View Access Logs
                      </p>
                      <p className="text-xs" style={{ color: "#5a6876" }}>
                        See which researchers received permissions and which analyses were executed.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 group hover:bg-opacity-50 p-2 rounded-md transition-colors duration-200">
                    <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#1a70fe" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                        Permissions
                      </p>
                      <p className="text-xs" style={{ color: "#5a6876" }}>
                        Grant or revoke on-chain access for specific queries via smart contract.
                      </p>
                      <a href="#" className="text-xs hover:underline" style={{ color: "#1a70fe" }}>
                        Learn more
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 group hover:bg-opacity-50 p-2 rounded-md transition-colors duration-200">
                    <Play className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#1a70fe" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                        Epidemiology Report
                      </p>
                      <p className="text-xs" style={{ color: "#5a6876" }}>
                        Trigger an FHE-powered count or prevalence query after permission checks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="border" style={{ backgroundColor: "#ffffff", borderColor: "#e8effb" }}>
            <CardHeader>
              <CardTitle style={{ color: "#141a21" }}>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#1a70fe" }}></div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                      New patient registered
                    </p>
                    <p className="text-xs" style={{ color: "#5a6876" }}>
                      2 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FFD700" }}></div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                      Appointment scheduled
                    </p>
                    <p className="text-xs" style={{ color: "#5a6876" }}>
                      5 minutes ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#bac0ca" }}></div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#141a21" }}>
                      Treatment completed
                    </p>
                    <p className="text-xs" style={{ color: "#5a6876" }}>
                      10 minutes ago
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border" style={{ backgroundColor: "#ffffff", borderColor: "#e8effb" }}>
            <CardHeader>
              <CardTitle style={{ color: "#141a21" }}>Disease Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "#5a6876" }}>
                    Diabetes
                  </span>
                  <span className="text-sm font-medium" style={{ color: "#141a21" }}>
                    23%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2" style={{ backgroundColor: "#dfe6f1" }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#1a70fe", width: "23%" }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "#5a6876" }}>
                    Hypertension
                  </span>
                  <span className="text-sm font-medium" style={{ color: "#141a21" }}>
                    18%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2" style={{ backgroundColor: "#dfe6f1" }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#FFD700", width: "18%" }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "#5a6876" }}>
                    Heart Disease
                  </span>
                  <span className="text-sm font-medium" style={{ color: "#141a21" }}>
                    15%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2" style={{ backgroundColor: "#dfe6f1" }}>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#bac0ca", width: "15%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {!isFormExpanded ? (
              <div
                onClick={() => setIsFormExpanded(true)}
                className="cursor-pointer rounded-xl p-6 border-2 border-dashed transition-all duration-300 hover:scale-105 hover:shadow-lg group"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#1a70fe",
                  boxShadow: "0 4px 6px -1px rgba(26, 112, 254, 0.1)",
                }}
              >
                <div className="flex items-center justify-center space-x-3">
                  <Plus className="h-6 w-6 transition-colors duration-300" style={{ color: "#1a70fe" }} />
                  <span className="text-lg font-semibold transition-colors duration-300" style={{ color: "#141a21" }}>
                    Add Person
                  </span>
                </div>
                <p className="text-center mt-2 text-sm" style={{ color: "#5a6876" }}>
                  Click to add a new patient record
                </p>
              </div>
            ) : (
              <Card
                className="border animate-in fade-in duration-500"
                style={{ backgroundColor: "#ffffff", borderColor: "#e8effb" }}
              >
                <CardHeader>
                  <CardTitle style={{ color: "#141a21" }}>Add New Person</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="id-number" style={{ color: "#141a21" }}>
                      Add ID number
                    </Label>
                    <Input
                      id="id-number"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Enter ID number"
                      className="border"
                      style={{ borderColor: "#e8effb" }}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label style={{ color: "#141a21" }}>Select Diseases</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {diseases.map((disease) => (
                        <div key={disease} className="flex items-center space-x-2">
                          <Checkbox
                            id={disease}
                            checked={selectedDiseases.includes(disease)}
                            onCheckedChange={() => handleDiseaseToggle(disease)}
                            style={{
                              borderColor: "#1a70fe",
                              backgroundColor: selectedDiseases.includes(disease) ? "#1a70fe" : "transparent",
                            }}
                          />
                          <Label htmlFor={disease} className="text-sm cursor-pointer" style={{ color: "#5a6876" }}>
                            {disease}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      onClick={handleSave}
                      className="flex-1 transition-all duration-300 hover:scale-105"
                      style={{
                        backgroundColor: "#1a70fe",
                        color: "#ffffff",
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsFormExpanded(false)}
                      variant="outline"
                      className="flex-1"
                      style={{
                        borderColor: "#e8effb",
                        color: "#5a6876",
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Tooltip */}
          {showHelpTooltip && (
            <div
              className="absolute bottom-full right-0 mb-2 px-3 py-2 text-sm rounded-lg shadow-lg animate-in fade-in duration-200"
              style={{ backgroundColor: "#141a21", color: "#ffffff" }}
            >
              Need help?
              <div
                className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                style={{ borderTopColor: "#141a21" }}
              ></div>
            </div>
          )}

          {/* Help Button */}
          <Button
            onClick={() => setIsHelpModalOpen(true)}
            onMouseEnter={() => setShowHelpTooltip(true)}
            onMouseLeave={() => setShowHelpTooltip(false)}
            className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
            style={{ backgroundColor: "#1a70fe", color: "#ffffff" }}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div
            className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 animate-in zoom-in duration-300"
            style={{ backgroundColor: "#ffffff" }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#e8effb" }}>
              <h3 className="text-lg font-semibold" style={{ color: "#141a21" }}>
                Contact us
              </h3>
              <Button
                onClick={() => setIsHelpModalOpen(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" style={{ color: "#5a6876" }} />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm" style={{ color: "#5a6876" }}>
                Ponte en contacto con nosotros
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium" style={{ color: "#141a21" }}>
                  Email:
                </span>
                <a href="mailto:support@example.com" className="text-sm hover:underline" style={{ color: "#1a70fe" }}>
                  support@example.com
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
