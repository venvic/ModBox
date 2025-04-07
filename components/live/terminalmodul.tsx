"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { PiClockAfternoonDuotone } from "react-icons/pi";
import { firebaseConfig } from "@/database"
import { initializeApp } from "firebase/app"
import { collection, doc, getDoc, getDocs, getFirestore, query } from "firebase/firestore"
import * as allIcons from 'react-icons/fa6'

type Tile = {
  id: string
  title: string
  url: string
  isIframe: boolean
  sort: number
  icon: string
}

type Settings = {
  theme: number
  backgroundImgUrl: string
  backgroundBlur: number
  tileBlur: number
  tilePadding: number
  tileGap: number
  tileColor: string
  topBarColor: string
  topBarPadding: number
  topBarTitleColor: string
  topBarLogos: string[]
  topBarShowTime: boolean
}

interface TerminalProps {
  product: {
    id: string
    slug: string
  }
  module: {
    id: string
    name: string
    description: string
    type: string
    settings: string
    slug: string
  }
}

const TileComponent = ({ tile, tileColor, tileBlur, tilePadding }: { tile: Tile, tileColor: string, tileBlur: number, tilePadding: number }) => {
  const handleClick = () => {
    if (tile.isIframe) {
      const iframe = document.createElement('iframe')
      iframe.src = tile.url
      iframe.style.position = 'fixed'
      iframe.style.top = '0'
      iframe.style.left = '0'
      iframe.style.width = '100%'
      iframe.style.height = '100%'
      iframe.style.zIndex = '9999'
      iframe.style.border = 'none'
      iframe.style.backgroundColor = 'white'
      document.body.appendChild(iframe)

      const closeButton = document.createElement('button')
      closeButton.innerText = 'x'
      closeButton.style.position = 'fixed'
      closeButton.style.backgroundColor = '#FFFFFF'
      closeButton.style.color = '#0000004F'
      closeButton.style.border = '1px solid #0000004F'
      closeButton.style.borderRadius = '50%'
      closeButton.style.paddingRight = '9px'
      closeButton.style.paddingLeft = '9px'
      closeButton.style.paddingBottom = '3px'
      closeButton.style.paddingTop = '0px'
      closeButton.style.top = '10px'
      closeButton.style.right = '10px'
      closeButton.style.zIndex = '10000'
      closeButton.onclick = () => {
        document.body.removeChild(iframe)
        document.body.removeChild(closeButton)
      }
      document.body.appendChild(closeButton)
    } else {
      window.open(tile.url, '_blank')
    }
  }

  return (
    <div
      className="flex flex-col h-fit min-w-[240px] items-center justify-center rounded-md cursor-pointer"
      style={{ backgroundColor: `${tileColor}4C`, backdropFilter: `blur(${tileBlur}px)`, padding: `${tilePadding}px` }}
      onClick={handleClick}
    >
      {tile.icon && React.createElement(allIcons[tile.icon as keyof typeof allIcons], { size: 48 })}
      <span className="mt-2 text-white">{tile.title}</span>
    </div>
  )
}

const TerminalModule: React.FC<TerminalProps> = ({ product, module }) => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState<string>("")
  const [activeTileIndex, setActiveTileIndex] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, "0")
      const minutes = now.getMinutes().toString().padStart(2, "0")
      setCurrentTime(`${hours}:${minutes}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const db = getFirestore(initializeApp(firebaseConfig))

        const settingsDocRef = doc(db, `product/${product.id}/modules/${module.id}/settings/default`)
        const settingsDoc = await getDoc(settingsDocRef)

        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as Settings)
        } else {
          setSettings(null)
        }

        const tilesCollectionRef = collection(db, `product/${product.id}/modules/${module.id}/tiles`)
        const tilesQuery = query(tilesCollectionRef)
        const tilesSnapshot = await getDocs(tilesQuery)

        if (!tilesSnapshot.empty) {
          const tilesData = tilesSnapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              }) as Tile,
          )
          setTiles(tilesData.sort((a, b) => a.sort - b.sort))
        } else {
          setTiles([])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setSettings(null)
        setTiles([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [product.id, module.id])

  if (loading || !settings) {
    return <div className="h-screen w-screen bg-white" />
  }

  const handleTileClick = (index: number) => {
    setActiveTileIndex(index);
  };

  const topBarContent = (
    <div className="flex items-center w-full gap-2">
      {settings.topBarLogos.map(
        (logo, index) =>
          logo && (
            <div key={index} className="h-8 w-8 relative">
              <img
                src={logo || "/placeholder.svg"}
                alt={`Logo ${index + 1}`}
                width={32}
                height={32}
                style={{ objectFit: "contain" }}
              />
            </div>
          ),
      )}
      <h1 className="font-bold text-lg w-full text-center">{module.name}</h1>
    </div>
  )

  return (
    <div className="h-screen w-screen bg-neutral-600 overflow-hidden relative">
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: settings.backgroundImgUrl ? `url(${settings.backgroundImgUrl})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `blur(${settings.backgroundBlur}px)`,
        }}
      />

      <div className="absolute inset-0 flex flex-col">
        <div
          className="w-full flex items-center justify-between"
          style={{
            backgroundColor: settings.topBarColor,
            padding: `${settings.topBarPadding}px`,
            color: settings.topBarTitleColor,
          }}
        >
          {settings.topBarLogos.length === 1 ? (
            topBarContent
          ) : (
            <div className="flex gap-4 items-center w-full pr-8">
              {settings.topBarLogos[0] && (
                <div className="h-8 w-8 relative">
                  <Image
                    src={settings.topBarLogos[0] || "/placeholder.svg"}
                    alt="Logo 1"
                    width={32}
                    height={32}
                    style={{ objectFit: "contain" }}
                  />
                </div>
              )}
              <a href={`https://heimatinfo.web.app/live/${product.slug}/${module.id}`} className="font-bold select-none text-lg">{module.name}</a>
              {settings.topBarLogos[1] && (
                <div className="h-8 w-8 ml-auto relative">
                  <Image
                    src={settings.topBarLogos[1] || "/placeholder.svg"}
                    alt="Logo 2"
                    width={32}
                    height={32}
                    style={{ objectFit: "contain" }}
                  />
                </div>
              )}
            </div>
          )}

          {settings.topBarShowTime && (
            <div className="flex items-center gap-2">
              <PiClockAfternoonDuotone className="h-5 w-5" />
              <span>{currentTime}</span>
            </div>
          )}
        </div>

        {settings.theme === 1 ? (
          <>
            <div className="flex-1 flex items-center justify-center">
              {tiles[activeTileIndex]?.url && (
                <iframe
                  src={tiles[activeTileIndex].url}
                  className="w-full h-full"
                  title="Tile Content"
                />
              )}
            </div>
            <div className="flex justify-center p-4" style={{ backgroundColor: `${settings.topBarColor}` }}>
              {tiles.map((tile, index) => (
                <button
                  key={tile.id}
                  style={{ color: `${settings.topBarTitleColor}`, backgroundColor: `${settings.tileColor}4C`, borderColor: `${settings.tileColor}4C` }}
                  className={`flex flex-col items-center mx-2 px-4 py-2 pt-3 rounded-md ${
                    activeTileIndex === index ? "border" : "border-none"
                  }`}
                  onClick={() => handleTileClick(index)}
                >
                  {React.createElement(allIcons[tile.icon as keyof typeof allIcons] || allIcons.FaSquare)}
                  <span className="text-xs mt-1">{tile.title || "Untitled"}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div
            className="flex-1 overflow-auto p-4 flex justify-center items-center"
            style={{
              gap: `${settings.tileGap}px`,
            }}
          >
            <div
              className="grid md:grid-cols-2"
              style={{
                gap: `${settings.tileGap}px`,
              }}
            >
              {tiles.map((tile) => (
                <TileComponent key={tile.id} tile={tile} tileColor={settings.tileColor} tileBlur={settings.tileBlur} tilePadding={settings.tilePadding} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TerminalModule

