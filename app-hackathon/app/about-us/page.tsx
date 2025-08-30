"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Shield, FileCheck, Eye, Heart, User, ArrowRight, FileText } from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#ffffff]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#dfe6f1] bg-[#ffffff]/95 backdrop-blur supports-[backdrop-filter]:bg-[#ffffff]/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <div className="mr-6 flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-[#e8effb] flex items-center justify-center">
                <Heart className="h-4 w-4 text-[#1a70fe]" />
              </div>
              <span className="font-bold text-[#141a21]">Apu HealthChain</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.section
          className="text-center py-16 md:py-24"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="space-y-8">
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Badge className="bg-[#dfe6f1] text-[#141a21] hover:bg-[#bac0ca]">Aleph Hackathon</Badge>
              <Badge className="bg-[#dfe6f1] text-[#141a21] hover:bg-[#bac0ca]">ZK + FHE</Badge>
              <Badge className="bg-[#dfe6f1] text-[#141a21] hover:bg-[#bac0ca]">Filecoin + Zama</Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance text-[#141a21]">
              Meet Apu HealthChain
            </h1>
            <p className="text-xl md:text-2xl text-[#5a6876] font-medium">Know Our Team, Prepare for a Journey</p>
            <p className="text-lg text-[#5a6876] max-w-3xl mx-auto text-pretty">
              We are a passionate team of developers and healthcare advocates building the future of privacy-preserving
              health data. Join us on our mission to revolutionize how sensitive medical information is stored, shared,
              and analyzed while maintaining the highest standards of privacy and security.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/connect">
              <Button size="lg" className="text-lg px-8 bg-[#1a70fe] hover:bg-[#1a70fe]/90 text-[#ffffff]">
                <Heart className="mr-2 h-5 w-5" />
                Start Your Journey With Us
              </Button></Link>
              <Link href="/documentation">
              <Button
                size="lg"
                className="text-lg px-8 bg-[#f3f9fe] border-[#dfe6f1] text-[#141a21] hover:bg-[#e8effb]"
              >
                Read Documentation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button></Link>
            </div>
          </motion.div>
        </motion.section>

        <Separator className="my-16 bg-[#dfe6f1]" />

        {/* Mission & Vision */}
        <motion.section
          className="py-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#141a21]">Our Mission</h2>
            <p className="text-xl text-[#5a6876] max-w-3xl mx-auto text-pretty">
              Apu HealthChain is a decentralized, privacy-preserving data vault designed for sensitive medical data. We
              enable pediatric health foundations to securely store encrypted data while facilitating privacy-preserving
              research that can save lives and improve healthcare outcomes.
            </p>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Security First",
                description: "End-to-end encryption ensures data never leaves the browser unprotected",
              },
              {
                icon: FileCheck,
                title: "Compliance Ready",
                description: "Built with HIPAA and GDPR compliance principles in mind",
              },
              {
                icon: Eye,
                title: "Full Transparency",
                description: "On-chain access control provides complete audit trails and transparency",
              },
              {
                icon: Heart,
                title: "Healthcare Impact",
                description: "Enable breakthrough research while protecting patient privacy",
              },
            ].map((value, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full text-center bg-[#f3f9fe] border-[#dfe6f1]">
                  <CardHeader>
                    <div className="mx-auto h-12 w-12 rounded-xl bg-[#e8effb] flex items-center justify-center mb-4">
                      <value.icon className="h-6 w-6 text-[#1a70fe]" />
                    </div>
                    <CardTitle className="text-lg text-[#141a21]">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm text-[#5a6876]">{value.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <Separator className="my-16 bg-[#dfe6f1]" />

        {/* Team */}
        <motion.section
          className="py-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#141a21]">Meet Our Team</h2>
            <p className="text-xl text-[#5a6876] max-w-3xl mx-auto text-pretty">
              We are a dedicated group of professionals united by our passion for healthcare innovation and data privacy.
              Each team member brings unique expertise to create a comprehensive solution for the future of health data
              management.
            </p>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Frontend Developer",
                description:
                  "Crafting intuitive user experiences and secure client-side encryption interfaces that make complex privacy technology accessible to healthcare professionals and families.",
              },
              {
                title: "Backend Developer",
                description:
                  "Building robust APIs and integrating cutting-edge FHE computations with decentralized storage to ensure seamless, secure data operations.",
              },
              {
                title: "Project Manager & Product Owner",
                description:
                  "Coordinating development efforts and ensuring our solution meets real-world healthcare compliance requirements while delivering exceptional user value.",
              },
              {
                title: "Blockchain Developer",
                description:
                  "Designing and implementing smart contracts for secure access control and data governance, ensuring transparent and immutable audit trails on the blockchain.",
              },
            ].map((member, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full text-center bg-[#f3f9fe] border-[#dfe6f1]">
                  <CardHeader>
                    <div className="h-20 w-20 rounded-xl bg-[#e8effb] mx-auto mb-4 flex items-center justify-center">
                      <User className="h-10 w-10 text-[#1a70fe]" />
                    </div>
                    <CardTitle className="text-lg text-[#141a21]">{member.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-[#5a6876]">{member.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <Separator className="my-16 bg-[#dfe6f1]" />

        <motion.section
          className="py-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#141a21]">Join Our Journey</h2>
            <p className="text-xl text-[#5a6876] max-w-3xl mx-auto text-pretty">
              We are just getting started. Our hackathon project is the foundation for a revolutionary approach to
              healthcare data privacy. Here is where we are headed and how you can be part of this transformative journey.
            </p>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Mobile-First Guardian Experience",
                description:
                  "Making health data management accessible anywhere, anytime with intuitive mobile applications designed for families and caregivers.",
              },
              {
                title: "AI-Powered Research Insights",
                description:
                  "Advanced machine learning models that unlock cross-dataset insights while maintaining absolute privacy through homomorphic encryption.",
              },
              {
                title: "Decentralized Identity Integration",
                description:
                  "Seamless authentication and credential verification using cutting-edge decentralized identity solutions for enhanced security.",
              },
              {
                title: "Enterprise Compliance Suite",
                description:
                  "Comprehensive HIPAA/GDPR compliance tools, detailed audit logs, and regulatory reporting for healthcare organizations.",
              },
            ].map((item, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full bg-[#f3f9fe] border-[#dfe6f1]">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#141a21]">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-[#5a6876]">{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <Separator className="my-16 bg-[#dfe6f1]" />

        {/* Call to Action */}
        <motion.section
          className="py-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <Card className="text-center p-12 bg-[#e8effb] border-[#dfe6f1]">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-bold mb-4 text-[#141a21]">
                Ready to Transform Healthcare Data?
              </CardTitle>
              <CardDescription className="text-lg max-w-2xl mx-auto text-[#5a6876]">
                Join us in revolutionizing healthcare data privacy. Whether you are a researcher, healthcare provider,
                technology partner, or simply someone who believes in better healthcare outcomes, let us build the future
                together.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-lg px-8 bg-[#1a70fe] hover:bg-[#1a70fe]/90 text-[#ffffff]">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  className="text-lg px-8 bg-[#ffffff] border-[#dfe6f1] text-[#141a21] hover:bg-[#f3f9fe]"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Read Our Vision
                </Button>
              </div>

              <p className="text-sm text-[#bac0ca]">
                Built with ❤️ for the Aleph Hackathon • Privacy-First • Healthcare-Focused
              </p>
            </CardContent>
          </Card>
        </motion.section>

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-[#bac0ca] border-t border-[#dfe6f1]">
          <p>© 2024 Apu HealthChain. Built for the Aleph Hackathon with ❤️ for healthcare privacy.</p>
        </footer>
      </main>
    </div>
  )
}
