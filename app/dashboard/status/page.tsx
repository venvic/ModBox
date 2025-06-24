'use client'
import React, { useEffect, useState } from 'react'
import { Check, Space } from 'lucide-react'
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { FaHand } from 'react-icons/fa6';

export default function Page() {
    const [userId, setUserId] = useState<string | null>(null);
    const [status, setStatus] = useState<{ currentUsers30Min: number; totalUsersLast30Days: number } | null>(null)
    const superAdmins = process.env.NEXT_PUBLIC_NORMALADMINS?.split(',') || [];

    useEffect(() => {
        async function load() {
        const res = await fetch('/api/status', { cache: 'no-store' })
        const data = await res.json()
        setStatus(data)
        }
        load()
    }, [])

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUserId(user ? user.uid : null);
        });
        return () => unsubscribe();
    }, []);

    const isNormalAdmin = userId ? superAdmins.includes(userId) : false;

  return (
    
    <div className='w-full min-h-screen flex  justify-center bg-background'>
        {isNormalAdmin ? (
        <div className='max-w-[1900px] w-full h-fit p-4 md:p-12 flex flex-col'>
            <div className='w-full h-fit bg-gradient-to-br from-green-700/90 to-green-600/90 px-5 py-4 rounded'>
                <h1 className='flex gap-2 items-center'><Check className='h-4 w-4'/> Alle Systeme in Betrieb</h1>
            </div>

            <h2 className='mt-12'>Aktueller Status: heimatinfo.web.app</h2>

            <div className='mt-4 grid grid-cols-1 md:grid-cols-2 divide-y divide-x border min-h-24 bg-accent rounded'>
                <div className='w-full h-full py-6 px-6 flex justify-between'>
                    <div className='h-full flex flex-col justify-between'>
                        <h3 className='font-semibold'>ModBox Dashboard</h3>
                        <p className='text-sm'>Normal</p>
                    </div>
                    <div className='h-5 w-5 bg-green-500 rounded-full flex items-center justify-center'>
                        <Check className='h-4 w-4 text-white' />
                    </div>
                </div>
                <div className='w-full h-full py-6 px-6 flex justify-between'>
                    <div className='h-full flex flex-col justify-between'>
                        <h3 className='font-semibold'>ModBox Live</h3>
                        <p className='text-sm'>Normal</p>
                    </div>
                    <div className='h-5 w-5 bg-green-500 rounded-full flex items-center justify-center'>
                        <Check className='h-4 w-4 text-white' />
                    </div>
                </div>
                <div className='w-full h-full py-6 px-6 flex justify-between'>
                    <div className='h-full flex flex-col justify-between'>
                        <h3 className='font-semibold'>Google API</h3>
                        <p className='text-sm'>Normal</p>
                    </div>
                    <div className='h-5 w-5 bg-green-500 rounded-full flex items-center justify-center'>
                        <Check className='h-4 w-4 text-white' />
                    </div>
                </div>
                <div className='w-full h-full py-6 px-6 flex justify-between'>
                    <div className='h-full flex flex-col justify-between'>
                        <h3 className='font-semibold'>Apple Maps</h3>
                        <p className='text-sm'>Normal</p>
                    </div>
                    <div className='h-5 w-5 bg-green-500 rounded-full flex items-center justify-center'>
                        <Check className='h-4 w-4 text-white' />
                    </div>
                </div>
                <div className='w-full h-full py-6 px-6 flex justify-between'>
                    <div className='h-full flex flex-col justify-between'>
                        <h3 className='font-semibold'>API Requests</h3>
                        <p className='text-sm'>Normal</p>
                    </div>
                    <div className='h-5 w-5 bg-green-500 rounded-full flex items-center justify-center'>
                        <Check className='h-4 w-4 text-white' />
                    </div>
                </div>
                <div className='w-full h-full py-6 px-6 flex justify-between'>
                    <div className='h-full flex flex-col justify-between'>
                        <h3 className='font-semibold'>Server Functions</h3>
                        <p className='text-sm'>Normal</p>
                    </div>
                    <div className='h-5 w-5 bg-green-500 rounded-full flex items-center justify-center'>
                        <Check className='h-4 w-4 text-white' />
                    </div>
                </div>
            </div>

            <h2 className='mt-12'>Analytics</h2>
            {status && (
                <div className="mt-6 px-6 py-4 bg-accent rounded border">
                    <h3 className='text-sm'>Aktuelle Nutzer (letzte 30 Minuten):</h3>
                    <p className="text-2xl font-semibold">{status.currentUsers30Min}</p>

                    <h3 className='text-sm mt-4'>Nutzer (letzte 30 Tage):</h3>
                    <p className="text-2xl font-semibold">{status.totalUsersLast30Days}</p>
                </div>
            )}
        </div>
        ) : (
            <div className='h-screen w-full flex flex-col items-center justify-center gap-4'>
              <FaHand className='h-10 w-10'/>
              <h1>Du hast keine Berechtigungen für diese Seite</h1>
            </div>
        )}
    </div>
  )
}
