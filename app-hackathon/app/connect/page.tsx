"use client" // MUY IMPORTANTE: para poder usar hooks y eventos del navegador.

import { useState } from "react"
import { useRouter } from "next/navigation" // Hook para la navegación
import { ethers } from "ethers"

// **PASO 1: Importamos tu componente de carga**
import Loading from "../home/loading"

export default function CryptoWalletOnboarding() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const connectWallet = async () => {
    setIsLoading(true)
    setErrorMessage("")

    if (typeof window.ethereum === "undefined") {
      setErrorMessage("Por favor, instala MetaMask para continuar.")
      setIsLoading(false)
      return
    }

    try {
      // Creamos dos promesas: una para la conexión y otra para un retraso mínimo.
      const connectPromise = new ethers.BrowserProvider(window.ethereum).send("eth_requestAccounts", [])
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 1000)) // 1 segundo de retraso

      // Esperamos a que AMBAS promesas se completen.
      const [accounts] = await Promise.all([connectPromise, delayPromise])

      if (accounts && accounts.length > 0) {
        const walletAddress = accounts[0]
        localStorage.setItem("walletAddress", walletAddress)
        // La navegación ocurre después de que todo esté listo y el retraso haya pasado
        router.push("/home")
      } else {
        // Si el usuario cierra MetaMask sin conectar
        setIsLoading(false)
        setErrorMessage("No se seleccionó ninguna cuenta.")
      }
    } catch (error: unknown) {
      console.error("Error al conectar la wallet:", error)
      if (error && typeof error === "object" && "message" in error) {
        setErrorMessage((error as { message?: string }).message || "Ocurrió un error al conectar.")
      } else {
        setErrorMessage("Ocurrió un error al conectar.")
      }
      setIsLoading(false) // Aseguramos que se quite la carga si hay error
    }
  }

  // **PASO 2: Renderizado condicional**
  // Si estamos cargando, muestra la pantalla de carga.
  if (isLoading) {
    return <Loading />
  }

  // Si no, muestra la página de login normal.
  return (
    <div className="min-h-screen bg-[#FEFBFF] flex flex-col overflow-hidden">
      {/* Tu código JSX existente para la página de login va aquí... */}
      <div className="flex justify-between items-center px-6 py-3 text-[#141a21]">
        <div className="flex items-center">
          <button
            onClick={() => router.push("/")}
            className="mr-3 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 shadow-md"
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path
                d="M19 12H5M12 19L5 12L12 5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="font-semibold">9:41</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-[#141a21] rounded-full"></div>
            <div className="w-1 h-3 bg-[#141a21] rounded-full"></div>
            <div className="w-1 h-3 bg-[#141a21] rounded-full"></div>
            <div className="w-1 h-3 bg-[#5a6876] rounded-full"></div>
          </div>
          <svg className="w-4 h-3 ml-1" viewBox="0 0 16 12" fill="none" aria-hidden="true">
            <path
              d="M1 3C1 1.89543 1.89543 1 3 1H13C14.1046 1 15 1.89543 15 3V9C15 10.1046 14.1046 11 13 11H3C1.89543 11 1 10.1046 1 9V3Z"
              stroke="#141a21"
              strokeWidth="1"
            />
            <path d="M2 4H14" stroke="#141a21" strokeWidth="1" />
          </svg>
          <div className="w-6 h-3 bg-[#141a21] rounded-sm ml-1"></div>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="mb-12 animate-float">
          <img
            src="/apu_logo.gif"
            alt="Apu HealthChain logo"
            width="250"
            height="250"
            className="opacity-95"
          />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#141a21] mb-2 animate-fadeUp">Data Guardian Vault</h1>
          <p className="text-lg font-medium bg-clip-text text-transparent animate-shimmer bg-[linear-gradient(90deg,#5a6876,#9aa6b2,#5a6876)] bg-[length:200%_100%]">
            by Zama
          </p>
        </div>
        <div className="text-center mb-16 max-w-sm animate-fadeUp [animation-delay:120ms]">
          <p className="text-[#5a6876] text-base leading-relaxed">
            Conecta tu wallet para asegurar y gestionar tus datos sensibles de forma descentralizada.
          </p>
        </div>
      </div>
      <div className="px-6 pb-8">
        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="w-full text-[#141a21] text-lg font-extrabold py-4 rounded-2xl shadow-lg bg-[#FFD700] active:scale-95 transition-transform duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 hover:shadow-[0_0_24px_rgba(255,215,0,0.55)] hover:scale-[1.015] animate-fadeUp [animation-delay:280ms] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Connect Wallet"
        >
          {isLoading ? "Conectando..." : "Connect Wallet"}
        </button>
        {errorMessage && <p className="text-red-500 text-center mt-4">{errorMessage}</p>}
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.animate-fadeUp{animation:fadeUp 520ms ease-out both}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:0 0}}.animate-shimmer{animation:shimmer 2.4s linear infinite}@keyframes float{0%{transform:translateY(0px)}50%{transform:translateY(-8px)}100%{transform:translateY(0px)}}.animate-float{animation:float 4s ease-in-out infinite}`}</style>
    </div>
  )
}
