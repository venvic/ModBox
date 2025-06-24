"use client"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { toast } from "sonner"
import { Verified, Star } from "lucide-react"

export default function Page() {
  const router = useRouter()
  const { uid } = useParams()
  const cardRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = (y - centerY) / 10
    const rotateY = (centerX - x) / 10

    const mouseX = (x / rect.width) * 100
    const mouseY = (y / rect.height) * 100

    setMousePosition({ x: mouseX, y: mouseY })

    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (cardRef.current) {
      cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
    }
    setMousePosition({ x: 50, y: 50 })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length < 1) return

    const touch = e.touches[0]
    const rect = cardRef.current.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = (y - centerY) / 15
    const rotateY = (centerX - x) / 15

    const mouseX = (x / rect.width) * 100
    const mouseY = (y / rect.height) * 100

    setMousePosition({ x: mouseX, y: mouseY })

    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    }
  }

  useEffect(() => {
    if (!uid) return
    const fetchUser = async () => {
      try {
        const db = getFirestore()
        const userId = Array.isArray(uid) ? uid[0] : uid
        const infoRef = doc(db, "global/users", userId, "info")
        const snap = await getDoc(infoRef)
        if (!snap.exists() || !snap.data().displayName) {
          router.push("/dashboard")
          return
        }
        {
          const { displayName, email } = snap.data()
          setName(displayName)
          setEmail(email)
        }
      } catch (e) {
        console.error("Error fetching user info:", e)
        toast.error("Fehler beim Abrufen des Datenbankes.")
      }
    }
    fetchUser()
  }, [uid, router])

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4">
      <div className="perspective-[1000px] w-full max-w-[620px]">
        <div
          ref={cardRef}
          className="h-auto md:h-[340px] w-full md:w-[620px] relative overflow-hidden cursor-pointer transition-all duration-300 ease-out"
          style={{
            borderRadius: "16px",
            background: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)",
            boxShadow: isHovered
              ? "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              : "0 15px 35px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchStart={handleMouseEnter}
          onTouchEnd={handleMouseLeave}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `url('/holo.jpg')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(0.5px)",
            }}
          />

          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 0.6 : 0.2,
              background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
                rgba(59, 130, 246, 0.4) 0%, 
                rgba(147, 51, 234, 0.3) 25%, 
                rgba(236, 72, 153, 0.3) 50%, 
                rgba(59, 130, 246, 0.2) 75%, 
                transparent 100%)`,
              mixBlendMode: "color-dodge",
            }}
          />

          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-500"
            style={{
              opacity: isHovered ? 0.8 : 0.3,
              background: `linear-gradient(${mousePosition.x * 3.6}deg, 
                transparent 30%, 
                rgba(255, 255, 255, 0.1) 50%, 
                transparent 70%)`,
              mixBlendMode: "overlay",
            }}
          />

          <div
            className="absolute inset-0 rounded-[16px] transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0.5,
              background: `linear-gradient(${mousePosition.x * 2}deg, 
                rgba(59, 130, 246, 0.5), 
                rgba(147, 51, 234, 0.5), 
                rgba(236, 72, 153, 0.5), 
                rgba(59, 130, 246, 0.5))`,
              padding: "1px",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          <div className="relative z-10 h-full w-full p-4 md:p-8 flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start mb-4 md:mb-6 gap-2 md:gap-0">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {name}
                </h1>
                <div className="flex items-center gap-2 bg-gradient-to-br from-purple-300 via-blue-200 to-white bg-clip-text text-transparent">
                  <span className="text-xs md:text-sm font-medium">VERIFIED MEMBER</span>
                  <Star size={14} className="text-yellow-400" />
                </div>
              </div>
              <div className="md:text-right">
                <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  ModBox
                </div>
                <div className="text-xs text-slate-400 mt-1">Heimat Info Product</div>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
              <div className="space-y-4 flex-1 w-full md:w-auto">
                <div className="space-y-1 md:space-y-2">
                  <div className="text-xs md:text-sm text-slate-400 uppercase tracking-wider">Email Address</div>
                  <div className="text-base md:text-lg font-medium text-white break-all">{email}</div>
                </div>

                <div className="space-y-1 md:space-y-2">
                  <div className="text-xs md:text-sm text-slate-400 uppercase tracking-wider">User ID</div>
                  <div className="text-xs md:text-sm font-mono text-slate-300 bg-slate-800/50 px-2 md:px-3 py-1 md:py-2 rounded-lg border border-slate-700 overflow-x-auto whitespace-nowrap">
                    {uid}
                  </div>
                </div>
              </div>

              <div className="md:ml-8 relative self-center md:self-auto mt-2 md:mt-0">
                <div className="relative p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <img src="/qr-code-l.png" alt="QR Code" className="w-16 md:w-20 h-16 md:h-20 rounded-lg" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-xl" />
                </div>
                <div className="text-xs text-slate-400 text-center mt-2">Scan to verify</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0 pt-4 border-t border-slate-700/50">
              <div className="flex items-center gap-2">
                <Verified size={16} className="text-slate-100" />
                <span className="text-xs md:text-sm text-slate-300">Authenticated & Secure</span>
              </div>
              <div className="text-xs text-slate-400">Valid until: Jan 2027</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
