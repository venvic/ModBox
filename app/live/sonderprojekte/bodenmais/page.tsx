"use client"

import { useState, useEffect } from "react"
import { MapPin, Calendar, Info, ChevronLeft, ChevronRight, Home, Landmark, PartyPopper } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { toast, Toaster } from "sonner"

interface TourismItem {
  id: string
  title: string
  description: string
  location?: string
  date?: string
  imageUrl?: string
  type: "event" | "attraction" | "accommodation"
  priceRange?: string
}

interface PaginationMeta {
  total: number
  pages: number
  currentPage: number
  pageSize: number
}

interface EndpointStatus {
  type: string
  loading: boolean
  loaded: boolean
  error: boolean
}

const CACHE_KEY_PREFIX = "bodenmais-tourism-data"
const CACHE_EXPIRY = 60 * 60 * 1000

const API_BASE_URL = "https://data.bayerncloud.digital/api/v4/endpoints"
const API_TOKEN = process.env.NEXT_PUBLIC_BAYERNCLOUD_API_KEY
const ENDPOINTS = [
  { url: "/list_events", type: "event", cacheKey: `${CACHE_KEY_PREFIX}-events` },
  { url: "/list_attractions", type: "attraction", cacheKey: `${CACHE_KEY_PREFIX}-attractions` },
  { url: "/list_accommodations", type: "accommodation", cacheKey: `${CACHE_KEY_PREFIX}-accommodations` },
]

const getCachedData = (cacheKey: string) => {
  if (typeof window === "undefined") return null

  const cachedData = localStorage.getItem(cacheKey)
  if (!cachedData) return null

  try {
    const { data, timestamp } = JSON.parse(cachedData)
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey)
      return null
    }
    return data
  } catch (e) {
    localStorage.removeItem(cacheKey)
    return null
  }
}

const setCachedData = (cacheKey: string, data: any) => {
  if (typeof window === "undefined") return

  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    }),
  )
}

const isRelatedToBodenmais = (item: any): boolean => {
  const searchTerm = "bodenmais"

  const locality = (item?.address?.addressLocality || "").toLowerCase()
  if (locality.includes(searchTerm)) return true

  const name = (item?.name || "").toLowerCase()
  if (name.includes(searchTerm)) return true

  const description = (item?.description || "").toLowerCase()
  if (description.includes(searchTerm)) return true

  if (locality.includes("bayerischer wald")) return true

  return false
}

export default function BodenmaistTourismWidget() {
  const [tourismData, setTourismData] = useState<TourismItem[]>([])
  const [endpointStatus, setEndpointStatus] = useState<EndpointStatus[]>(
    ENDPOINTS.map((endpoint) => ({
      type: endpoint.type,
      loading: true,
      loaded: false,
      error: false,
    })),
  )
  const [activeTab, setActiveTab] = useState<string>("all")
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total: 0,
    pages: 0,
    currentPage: 1,
    pageSize: 6,
  })

  const isLoading = endpointStatus.some((status) => status.loading)

  const filteredData = activeTab === "all" ? tourismData : tourismData.filter((item) => item.type === activeTab)

  const getPaginatedItems = (items: TourismItem[]) => {
    const { currentPage, pageSize } = paginationMeta
    const startIndex = (currentPage - 1) * pageSize
    return items.slice(startIndex, startIndex + pageSize)
  }

  const displayedItems = getPaginatedItems(filteredData)

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setPaginationMeta((prev) => ({
      ...prev,
      currentPage: 1,
      total: value === "all" ? tourismData.length : tourismData.filter((item) => item.type === value).length,
      pages: Math.ceil(
        (value === "all" ? tourismData.length : tourismData.filter((item) => item.type === value).length) /
          prev.pageSize,
      ),
    }))
  }

  const fetchWithDelay = async (url: string, delay = 1000) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              "Content-Type": "application/json",
            },
          })

          if (!response.ok) {
            if (response.status === 429) {
              console.warn("Rate limit hit, will retry with longer delay")
              resolve(null)
              return
            }
            throw new Error(`API request failed with status ${response.status}`)
          }

          const data = await response.json()
          resolve(data)
        } catch (error) {
          console.error("Error fetching data:", error)
          resolve(null)
        }
      }, delay)
    })
  }

  const processData = (data: any, type: string): TourismItem[] => {
    if (!data || !data["@graph"]) {
      console.log(`No data or @graph found for ${type}:`, data)
      return []
    }

    console.log(`Raw data for ${type}:`, data["@graph"].length, "items")

    const filteredItems = data["@graph"].filter(isRelatedToBodenmais)

    console.log(`Filtered ${filteredItems.length} items related to Bodenmais for ${type}`)

    const items = filteredItems.map((item: any) => {
      let imageUrl = "/placeholder.svg?height=300&width=500"

      if (item.image) {
        if (Array.isArray(item.image) && item.image.length > 0) {
          imageUrl = item.image[0]?.contentUrl || imageUrl
        } else {
          imageUrl = item.image?.contentUrl || imageUrl
        }
      }

      return {
        id: item["@id"] || item.id || crypto.randomUUID(),
        title: item.name || "Ohne Titel",
        description: item.description || "Keine Beschreibung verfügbar.",
        location:
          item.address?.addressLocality || (item.location && item.location[0]?.address?.addressLocality) || "Bodenmais",
        date: item.startDate || "",
        imageUrl,
        type: type as "event" | "attraction" | "accommodation",
        priceRange: item.priceRange || "",
      }
    })

    console.log(`Processed ${items.length} items for ${type}`)
    return items
  }

  const fetchEndpointData = async (endpoint: (typeof ENDPOINTS)[0], delay: number) => {
    setEndpointStatus((prev) =>
      prev.map((status) => (status.type === endpoint.type ? { ...status, loading: true, error: false } : status)),
    )

    const cachedData = getCachedData(endpoint.cacheKey)
    if (cachedData) {
      console.log(`Found ${cachedData.length} cached items for ${endpoint.type}`)

      setTourismData((prev) => [...prev, ...cachedData])

      setPaginationMeta((prev) => {
        const newTotal = prev.total + cachedData.length
        return {
          ...prev,
          total: newTotal,
          pages: Math.ceil(newTotal / prev.pageSize),
        }
      })

      setEndpointStatus((prev) =>
        prev.map((status) => (status.type === endpoint.type ? { ...status, loading: false, loaded: true } : status)),
      )

      return true
    }

    let retries = 0
    let data = null

    while (retries < 3 && data === null) {
      console.log(`Fetching ${endpoint.url} (attempt ${retries + 1})`)
      data = await fetchWithDelay(`${API_BASE_URL}${endpoint.url}`, delay + retries * 3000)
      retries++
    }

    if (data) {
      console.log(`Successfully fetched data from ${endpoint.url}`)
      toast.success(`Daten für ${endpoint.type} erfolgreich geladen!`)

      const processedData = processData(data, endpoint.type)

      setCachedData(endpoint.cacheKey, processedData)

      setTourismData((prev) => [...prev, ...processedData])

      setPaginationMeta((prev) => {
        const newTotal = prev.total + processedData.length
        return {
          ...prev,
          total: newTotal,
          pages: Math.ceil(newTotal / prev.pageSize),
        }
      })

      setEndpointStatus((prev) =>
        prev.map((status) => (status.type === endpoint.type ? { ...status, loading: false, loaded: true } : status)),
      )

      return true
    } else {
      console.error(`Failed to fetch data from ${endpoint.url} after ${retries} attempts`)
      toast.error(`Fehler beim Laden von ${endpoint.type}`)

      setEndpointStatus((prev) =>
        prev.map((status) => (status.type === endpoint.type ? { ...status, loading: false, error: true } : status)),
      )

      return false
    }
  }

  const fetchAllData = async () => {
    setTourismData([])
    setEndpointStatus(
      ENDPOINTS.map((endpoint) => ({
        type: endpoint.type,
        loading: true,
        loaded: false,
        error: false,
      })),
    )

    for (let i = 0; i < ENDPOINTS.length; i++) {
      const endpoint = ENDPOINTS[i]
      const delay = i * 2000

      fetchEndpointData(endpoint, delay)
    }
  }

  useEffect(() => {
    const filteredItems = activeTab === "all" ? tourismData : tourismData.filter((item) => item.type === activeTab)

    setPaginationMeta((prev) => ({
      ...prev,
      total: filteredItems.length,
      pages: Math.ceil(filteredItems.length / prev.pageSize),
      currentPage: 1,
    }))
  }, [activeTab, tourismData])

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    const allEndpointsFinished = endpointStatus.every((status) => !status.loading)

    if (allEndpointsFinished && tourismData.length === 0) {
      const fallbackData: TourismItem[] = [
        {
          id: "1",
          title: "Silberberg Bergbaumuseum",
          description: "Entdecken Sie die historischen Bergbautraditionen von Bodenmais im Silberberg Bergbaumuseum...",
          location: "Silberberg, Bodenmais",
          imageUrl: "/placeholder.svg?height=300&width=500",
          type: "attraction",
        },
        {
          id: "2",
          title: "Wandern im Bayerischen Wald",
          description: "Wunderschöne Wanderwege rund um Bodenmais mit geführten Touren...",
          location: "Bayerischer Wald, Bodenmais",
          date: "Tägliche Touren verfügbar",
          imageUrl: "/placeholder.svg?height=300&width=500",
          type: "event",
        },
        {
          id: "3",
          title: "Hotel Bayerischer Wald",
          description: "Gemütliches Hotel im Herzen des Bayerischen Waldes...",
          location: "Bodenmais",
          priceRange: "ab 80€",
          imageUrl: "/placeholder.svg?height=300&width=500",
          type: "accommodation",
        },
      ]

      setTourismData(fallbackData)
      setPaginationMeta((prev) => ({
        ...prev,
        total: fallbackData.length,
        pages: Math.ceil(fallbackData.length / prev.pageSize),
      }))

      toast.warning("Keine Einträge für Bodenmais gefunden. Beispiel-Daten angezeigt.")
    } else if (allEndpointsFinished && tourismData.length > 0) {
      toast.success(`Insgesamt ${tourismData.length} Einträge für Bodenmais geladen!`)
    }
  }, [endpointStatus, tourismData.length])

  const goToNextPage = () => {
    setPaginationMeta((prev) => ({
      ...prev,
      currentPage: Math.min(prev.currentPage + 1, prev.pages),
    }))
  }

  const goToPrevPage = () => {
    setPaginationMeta((prev) => ({
      ...prev,
      currentPage: Math.max(prev.currentPage - 1, 1),
    }))
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case "event":
        return <PartyPopper size={16} className="mr-1 text-[#6DB4AE]" />
      case "attraction":
        return <Landmark size={16} className="mr-1 text-[#6DB4AE]" />
      case "accommodation":
        return <Home size={16} className="mr-1 text-[#6DB4AE]" />
      default:
        return <Info size={16} className="mr-1 text-[#6DB4AE]" />
    }
  }

  const getLoadingStatusText = () => {
    const loadingEndpoints = endpointStatus
      .filter((status) => status.loading)
      .map((status) => {
        switch (status.type) {
          case "event":
            return "Veranstaltungen"
          case "attraction":
            return "Sehenswürdigkeiten"
          case "accommodation":
            return "Unterkünfte"
          default:
            return status.type
        }
      })

    if (loadingEndpoints.length === 0) return ""
    return `Lade ${loadingEndpoints.join(", ")}...`
  }

  return (
    <main className="min-h-screen bg-white">
      <Toaster position="top-right" />
      <div className="max-w-full mx-auto">
        <header className="mb-6 py-6 text-center bg-[#94232C]">
          <h1 className="text-2xl font-bold text-white">Bodenmais Tourismus</h1>
          <p className="text-white/90">Entdecken Sie, was in Bodenmais passiert</p>
        </header>

        <div className="p-4">
          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 gap-2 bg-gray-200">
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="event">Veranstaltungen</TabsTrigger>
              <TabsTrigger value="attraction">Sehenswürdigkeiten</TabsTrigger>
              <TabsTrigger value="accommodation">Unterkünfte</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex justify-between items-center mb-4">
            {isLoading && (
              <div className="text-sm text-gray-500 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-spin mr-2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {getLoadingStatusText()}
              </div>
            )}

            <div className="ml-auto">
              <Button
                variant="outline"
                onClick={() => {
                  // Clear all caches
                  ENDPOINTS.forEach((endpoint) => {
                    if (typeof window !== "undefined") {
                      localStorage.removeItem(endpoint.cacheKey)
                    }
                  })
                  // Refetch data
                  fetchAllData()
                  toast.info("Daten werden neu geladen...")
                }}
                className="flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isLoading ? "animate-spin" : ""}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Aktualisieren
              </Button>
            </div>
          </div>

          {tourismData.length === 0 && isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 border-none bg-gray-200">
                  <div className="flex flex-col space-y-3">
                    <Skeleton className="h-4 w-3/4 bg-white" />
                    <Skeleton className="h-20 w-full bg-gray-50" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4 rounded-full bg-white" />
                      <Skeleton className="h-4 w-1/3 bg-white" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {displayedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-lg text-gray-500">
                    {isLoading ? "Daten werden geladen..." : "Keine Einträge gefunden."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {displayedItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden bg-gray-200 border-[#6DB4AE]">
                      {item.imageUrl && (
                        <div className="h-48 overflow-hidden">
                          <Image
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.title}
                            width={600}
                            height={400}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          {getItemIcon(item.type)}
                          <span className="text-xs text-[#6DB4AE] font-medium">
                            {item.type === "event"
                              ? "Veranstaltung"
                              : item.type === "attraction"
                                ? "Sehenswürdigkeit"
                                : "Unterkunft"}
                          </span>
                        </div>
                        <h2 className="text-lg font-semibold text-[#94232C] mb-2">{item.title}</h2>
                        <p className="text-gray-600 mb-3 line-clamp-3">{item.description}</p>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                          {item.location && (
                            <div className="flex items-center">
                              <MapPin size={16} className="mr-1 text-[#6DB4AE]" />
                              <span>{item.location}</span>
                            </div>
                          )}
                          {item.date && (
                            <div className="flex items-center">
                              <Calendar size={16} className="mr-1 text-[#6DB4AE]" />
                              <span>{new Date(item.date).toLocaleDateString("de-DE")}</span>
                            </div>
                          )}
                          {item.priceRange && (
                            <div className="flex items-center">
                              <span className="font-medium text-[#6DB4AE]">{item.priceRange}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Seite {paginationMeta.currentPage} von {paginationMeta.pages || 1} ({paginationMeta.total || 0}{" "}
                  Einträge)
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={paginationMeta.currentPage <= 1}
                    className="flex items-center"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Zurück
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={paginationMeta.currentPage >= paginationMeta.pages}
                    className="flex items-center"
                  >
                    Weiter
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
