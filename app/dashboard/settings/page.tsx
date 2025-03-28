'use client'
import React, { useEffect, useState } from 'react'
import { FaHand } from 'react-icons/fa6'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const superAdmins = process.env.NEXT_PUBLIC_SUPERADMINS?.split(',') || [];
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const isSuperAdmin = userId ? superAdmins.includes(userId) : false;

  const handleActivate = async () => {
    try {
      const response = await fetch('/api/killSwitch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Kill Switch aktiviert', { description: data.message});
      } else {
        const errorData = await response.json();
        toast.error('Fehler beim Aktivieren des Kill Switch', { description: errorData.error });
      }
    } catch (error:any) {
      toast.error('Fehler beim Aktivieren des Kill Switch', { description: error });
    }

    setIsModalOpen(false);
  };

  return (
    <div className='w-full h-screen flex flex-col gap-4 items-center bg-background justify-center'>
      {isSuperAdmin ? (
        <>
          <div className='w-fit h-fit max-w-[540px]'>
            <h1 className='font-semibold text-lg'>Kill Switch</h1>
            <p className='text-sm text-neutral-300'>Sobald diese Funktion ausgeführt wird, sind alle Lesevorgänge für Nutzer eingeschränkt, und sämtliche Module werden für sie nicht mehr sichtbar.</p>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className='mt-4'>Aktivieren</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kritische Aktion ausführen?</DialogTitle>  
                  <DialogDescription>Diese Aktion kann nicht rückgängig gemacht werden und sollte nur in dringenden Sicherheitsfällen bestätigt werden.</DialogDescription>  
                </DialogHeader>
                <DialogFooter className='w-full flex flex-col justify-between'>
                  <Button variant="outline" className='mr-auto' onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
                  <Button variant="destructive" onClick={handleActivate}>Bestätigen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </>
      ) : (
        <>
          <FaHand className='h-10 w-10'/>
          <h1>Du hast keine Berechtigungen für diese Seite</h1>
        </>
      )}
    </div>
  )
}
