"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { getAuth } from "firebase/auth"
import { FaSun } from "react-icons/fa6"

type ThemeOption = "cosmema" | "modern" | "minimal" | "brain-rot"
const LAST_USED_THEME_KEY = "last_used_theme"
const ALLOWED_UIDS = ["WermfDVKf4eyl8TXR1wGmOlFZsA2", "zYulj2FQOfVebqKhLMmX3LfYM193"]

function ThemePreview({ theme }: { theme: ThemeOption }) {
  switch (theme) {
    case "modern":
      return (
        <div className="w-full h-full aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-sm flex flex-col">
          <div className="h-1/4 bg-primary/90 p-1">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/70"></div>
              <div className="w-2 h-2 rounded-full bg-white/70"></div>
              <div className="w-2 h-2 rounded-full bg-white/70"></div>
            </div>
          </div>
          <div className="flex flex-1">
            <div className="w-1/4 bg-slate-700/50"></div>
            <div className="flex-1 p-1">
              <div className="w-full h-2 bg-slate-600 rounded-full mb-1"></div>
              <div className="w-3/4 h-2 bg-slate-600 rounded-full"></div>
            </div>
          </div>
        </div>
      )
    case "cosmema":
      return (
        <div className="w-full h-full aspect-video bg-gradient-to-br from-amber-900/30 to-amber-800/30 rounded-sm flex flex-col">
          <div className="h-1/5 bg-amber-700/90 flex items-center justify-center">
            <div className="w-1/2 h-2 bg-white/70 rounded-full"></div>
          </div>
          <div className="flex-1 p-1">
            <div className="flex gap-1 mb-1">
              <div className="w-1/3 h-2 bg-amber-700/50 rounded"></div>
              <div className="w-1/3 h-2 bg-amber-700/50 rounded"></div>
              <div className="w-1/3 h-2 bg-amber-700/50 rounded"></div>
            </div>
            <div className="w-full h-12 bg-amber-700/30 rounded mb-1"></div>
            <div className="w-full h-2 bg-amber-700/50 rounded-full mb-1"></div>
            <div className="w-3/4 h-2 bg-amber-700/50 rounded-full"></div>
          </div>
        </div>
      )
    case "minimal":
      return (
        <div className="w-full h-full aspect-video bg-white rounded-sm flex flex-col">
          <div className="h-8 border-b flex items-center px-2">
            <div className="w-1/3 h-1 bg-gray-300 rounded-full"></div>
          </div>
          <div className="flex-1 p-2">
            <div className="w-full h-3 bg-gray-100 rounded mb-2"></div>
            <div className="w-full h-3 bg-gray-100 rounded mb-2"></div>
            <div className="w-2/3 h-3 bg-gray-100 rounded"></div>
          </div>
        </div>
      )
    case "brain-rot":
      return (
        <div className="w-full h-full aspect-video rounded-sm flex items-center justify-center bg-gray-800">
          <img src="/fun/preview.png" alt="Brain Rot Preview" className="object-cover w-full h-full" />
        </div>
      )
  }
}

export function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>("modern")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [userUID, setUserUID] = useState<string | null>(null)

  const getLastUsedTheme = (): ThemeOption => {
    const storedTheme = localStorage.getItem(LAST_USED_THEME_KEY)
    return storedTheme ? (storedTheme as ThemeOption) : "modern"
  }

  const applyTheme = (theme: ThemeOption) => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem(LAST_USED_THEME_KEY, theme)
  }

  useEffect(() => {
    const storedTheme = getLastUsedTheme()
    setSelectedTheme(storedTheme)
    const auth = getAuth();
    const user = auth.currentUser;
    const uid = user?.uid;
    setUserUID(uid ?? null)
  }, [])

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (open) {
      const storedTheme = getLastUsedTheme()
      setSelectedTheme(storedTheme)
    }
  }

  const handleThemeSelect = useCallback((theme: ThemeOption) => {
    setSelectedTheme(theme)
  }, [])

  const handleApplyTheme = useCallback(() => {
    applyTheme(selectedTheme)
    setIsDialogOpen(false)
  }, [selectedTheme])

  const availableThemes: ThemeOption[] = ["cosmema", "modern", "minimal"]
  if (userUID && ALLOWED_UIDS.includes(userUID)) {
    availableThemes.push("brain-rot")
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start px-3 py-2 border w-full h-auto flex items-center font-normal">
          <FaSun/> {selectedTheme}
        </Button>
      </DialogTrigger>
      <DialogContent className="theme-dialog sm:max-w-md">
        <DialogTitle>Darstellung wählen</DialogTitle>
        <div className="py-4">
          <div className="grid grid-cols-3 gap-4">
            {availableThemes.map((theme) => (
              <div
                key={theme}
                onClick={() => handleThemeSelect(theme)}
                className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                  selectedTheme === theme
                    ? "ring-2 ring-primary ring-offset-2"
                    : "hover:ring-1 hover:ring-muted-foreground"
                }`}
              >
                <div className="aspect-video">
                  <ThemePreview theme={theme} />
                </div>
                <div className="p-2 bg-background border-t">
                  <p className="text-sm font-medium capitalize">{theme === "brain-rot" ? "Brain Rot" : theme}</p>
                </div>
                {selectedTheme === theme && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleApplyTheme} className="w-full sm:w-auto">
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
