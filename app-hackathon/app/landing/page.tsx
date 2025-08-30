"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Shield, Database, Key, BarChart3, Wallet, Upload, Users } from "lucide-react"
import { useEffect, useRef } from "react"

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null)
  const benefitsRef = useRef<HTMLElement>(null)
  const howItWorksRef = useRef<HTMLElement>(null)
  const testimonialsRef = useRef<HTMLElement>(null)
  const sponsorsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up")
          }
        })
      },
      { threshold: 0.1 },
    )

    const sections = [
      heroRef.current,
      benefitsRef.current,
      howItWorksRef.current,
      testimonialsRef.current,
      sponsorsRef.current,
    ]
    sections.forEach((section) => {
      if (section) observer.observe(section)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToFeatures = () => {
    benefitsRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#ffffff" }}>
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="px-4 py-16 md:py-24 lg:py-32 text-center opacity-0 transition-all duration-1000 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Subtle grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: "40px 40px",
            }}
          ></div>
          {/* Glowing orbs for visual interest */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance text-white">
            Own your encrypted health data.
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed text-white/90">
            Client-side encryption, Filecoin storage, and on-chain permissions for privacy-preserving research.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/connecting">
              <Button
                size="lg"
                className="px-8 py-3 text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: "#FFD700", color: "#141a21" }}
              >
                Connect Wallet
              </Button>
            </Link>
            <button
              onClick={scrollToFeatures}
              className="text-lg font-medium transition-colors duration-200 hover:opacity-80 text-white/90 hover:text-white"
            >
              Learn more
            </button>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section
        ref={benefitsRef}
        className="px-4 py-16 opacity-0 transition-all duration-1000"
        style={{ backgroundColor: "#f3f9fe" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff", borderColor: "#dfe6f1" }}
            >
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: "#1a70fe" }} />
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#141a21" }}>
                  End-to-End Encryption
                </h3>
                <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                  Encrypt on the client, keep control at all times.
                </p>
              </CardContent>
            </Card>

            <Card
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff", borderColor: "#dfe6f1" }}
            >
              <CardContent className="p-6 text-center">
                <Database className="w-12 h-12 mx-auto mb-4" style={{ color: "#1a70fe" }} />
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#141a21" }}>
                  Decentralized Storage
                </h3>
                <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                  Store encrypted data by CID on Filecoin.
                </p>
              </CardContent>
            </Card>

            <Card
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff", borderColor: "#dfe6f1" }}
            >
              <CardContent className="p-6 text-center">
                <Key className="w-12 h-12 mx-auto mb-4" style={{ color: "#1a70fe" }} />
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#141a21" }}>
                  On-Chain Permissions
                </h3>
                <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                  Grant/revoke access via smart contract.
                </p>
              </CardContent>
            </Card>

            <Card
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff", borderColor: "#dfe6f1" }}
            >
              <CardContent className="p-6 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4" style={{ color: "#1a70fe" }} />
                <h3 className="text-xl font-semibold mb-3" style={{ color: "#141a21" }}>
                  Privacy-Preserving Analysis
                </h3>
                <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                  Run FHE queries to get only aggregated results.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="px-4 py-16 opacity-0 transition-all duration-1000">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12" style={{ color: "#141a21" }}>
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "#e8effb" }}
              >
                <Wallet className="w-8 h-8" style={{ color: "#1a70fe" }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#141a21" }}>
                Connect Wallet
              </h3>
              <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                Authenticate with MetaMask (Sepolia).
              </p>
              <div className="hidden md:block mt-4">
                <div className="w-8 h-0.5" style={{ backgroundColor: "#bac0ca" }}></div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "#e8effb" }}
              >
                <Upload className="w-8 h-8" style={{ color: "#1a70fe" }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#141a21" }}>
                Upload & Encrypt
              </h3>
              <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                Client-side encryption; backend stores only the CID.
              </p>
              <div className="hidden md:block mt-4">
                <div className="w-8 h-0.5" style={{ backgroundColor: "#bac0ca" }}></div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "#e8effb" }}
              >
                <Users className="w-8 h-8" style={{ color: "#1a70fe" }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#141a21" }}>
                Grant & Analyze
              </h3>
              <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                Allow a researcher and run FHE analysis for safe insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        ref={testimonialsRef}
        className="px-4 py-16 opacity-0 transition-all duration-1000"
        style={{ backgroundColor: "#f3f9fe" }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: "#141a21" }}>
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Avatar className="w-12 h-12 mr-4">
                    <AvatarImage
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAd4BqHu5QKl-QbkwC5Qw3OM355upUdARR6-siWcwTAdCGUv3hDx9H0TOprSaMB7qFrWsnxiHkYNQbaISJXdcb5smoDBTxSNiSNc-DbProj4mpxDo3KPq1CaR9Q4nYShmb3Cft-8jHbaererKyoAVogbnNmxNd6eZzH_RwlwUTtJTq5XM1ZzXnp9PISAYnbtEQm3O9iBnj3SZYBl-O9DTuwDLFzlpaD_hjCtMxXgvLUPtkMVrz7pj7Rhcj_ltYqJ9_Jb5I4XA3JbsQ"
                      alt="Mark Thompson"
                      className="object-cover"
                    />
                    <AvatarFallback>MT</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold" style={{ color: "#141a21" }}>
                      Mark Thompson
                    </h4>
                    <p className="text-sm" style={{ color: "#5a6876" }}>
                      Patient
                    </p>
                  </div>
                </div>
                <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                  Implementing SecureHealth has streamlined our workflow and significantly improved our data security
                  and compliance. Highly recommended!
                </p>
              </CardContent>
            </Card>

            <Card
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Avatar className="w-12 h-12 mr-4">
                    <AvatarImage
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuClNNZnXisrJgi6l1OQGlpgasYsbjt5n-cu3C8ZEFvY01Lt64XxLZE7cg2ykAAfCqzQgRImlKRN0lisW_2zWMjtk4tk1LphEXgCMMonM-gNW90RWBdOol7y6f24swWW3t2nd9L9doeDMYjDoTHm8X-r5OH02mnJpH31xhTvOwW5qZdZ8Tf9xI3_1vQNs2kI9NRbs0RRZ-aDFdrQTpPseb9wIZhCWeA5gEGmzUkFV8WW9E-7coMuX59gvLc5t-vvZfRBDnYaTedlWh8"
                      alt="Nurse Sarah Lee"
                      className="object-cover"
                    />
                    <AvatarFallback>SL</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold" style={{ color: "#141a21" }}>
                      Nurse Sarah Lee
                    </h4>
                    <p className="text-sm" style={{ color: "#5a6876" }}>
                      Clinic Manager
                    </p>
                  </div>
                </div>
                <p className="leading-relaxed" style={{ color: "#5a6876" }}>
                  SecureHealth made our data workflows safer and faster without sacrificing usability.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section ref={sponsorsRef} className="px-4 py-16" style={{ backgroundColor: "#ffffff" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-12" style={{ color: "#141a21" }}>
            Powered By
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            {/* ZAMA PROTOCOL */}
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-200">
              <img src="/zama-protocol-logo-dark-text.png" alt="ZAMA PROTOCOL" className="h-12 md:h-16 object-contain" />
            </div>

            {/* V0 by Vercel */}
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-200">
              <img src="/v0-by-vercel-logo-black-text.png" alt="V0 by Vercel" className="h-12 md:h-16 object-contain" />
            </div>

            {/* FILECOIN */}
            <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-200">
              <img src="/filecoin-logo-blue-text.png" alt="FILECOIN" className="h-12 md:h-16 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 py-16 text-center" style={{ backgroundColor: "#1a70fe" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Ready to secure your health data?</h2>
          <p className="text-lg mb-8 text-white/90 leading-relaxed">
            Join guardians and researchers using encrypted vaults and FHE.
          </p>
          <Link href="/connecting">
            <Button
              size="lg"
              className="px-8 py-3 text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff", color: "#141a21" }}
            >
              Get Started — Connect Wallet
            </Button>
          </Link>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="px-4 py-8 text-center" style={{ backgroundColor: "#ffffff", borderTop: "1px solid #dfe6f1" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-sm mb-4" style={{ color: "#5a6876" }}>
            © 2025 SecureHealth. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="#" className="transition-colors duration-200 hover:opacity-80" style={{ color: "#5a6876" }}>
              Privacy
            </a>
            <span style={{ color: "#bac0ca" }}>•</span>
            <a href="#" className="transition-colors duration-200 hover:opacity-80" style={{ color: "#5a6876" }}>
              Terms
            </a>
            <span style={{ color: "#bac0ca" }}>•</span>
            <a href="#" className="transition-colors duration-200 hover:opacity-80" style={{ color: "#5a6876" }}>
              Contact
            </a>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
