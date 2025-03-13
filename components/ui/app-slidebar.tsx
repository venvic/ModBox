'use client'
import { Calendar, ChevronUp, Home, Inbox, Plus, Search, Settings, User, Users } from "lucide-react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTrigger } from "./dialog"
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/database'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu"
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu"
import { Collapsible } from "@radix-ui/react-collapsible"
import { CollapsibleContent, CollapsibleTrigger } from "./collapsible"
import { useRouter } from "next/navigation"

if (!getApps().length) {
  initializeApp(firebaseConfig)
}
const db = getFirestore()

const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Nutzer verwalten",
    url: "dashboard/users",
    icon: Users,
  },
]

export function AppSidebar() {
  const [product, setProduct] = useState<{ name: string; modulesCount: number, id: string }[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter();

  const handleAddGemeinde = () => {
    router.push('/dashboard?addGemeinde=true');
  };

  useEffect(() => {
    const fetchGemeinden = async () => {
      const querySnapshot = await getDocs(collection(db, 'product'))
      const products = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const modulesCollection = collection(db, 'product', doc.id, 'modules')
        const modulesSnapshot = await getDocs(modulesCollection)
        return {
            name: doc.data().name,
            id: doc.id,
            modulesCount: modulesSnapshot.size,
        }
      }))
      setProduct(products)
    }

    fetchGemeinden()

    const auth = getAuth()
    onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email)
      } else {
        setUserEmail("Unknown User")
      }
    })
  }, [])

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Heimat Info</SidebarGroupLabel>
          <SidebarGroupAction title="Gemeinde Hinzufügen" onClick={handleAddGemeinde}>
            <Plus /> <span className="sr-only">Hinzufügen</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Inbox /> <span>Gemeinden</span>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {product.map((product) => (
                        <SidebarMenuSubItem key={product.id} className="flex py-[2px] cursor-pointer" onClick={() => router.push(`/dashboard/${product.id}`)}>
                          {product.name}
                          <SidebarMenuBadge>{product.modulesCount}</SidebarMenuBadge>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User /> {userEmail || "Loading..."}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem>
                  <Dialog>
                    <DialogTrigger asChild>
                      <span>Settings</span>
                    </DialogTrigger>
                    <DialogContent>
                      <h2>Settings</h2>
                      {/* Add settings content here */}
                    </DialogContent>
                  </Dialog>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
