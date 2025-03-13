'use client'
import React from 'react'
import { FaHand } from 'react-icons/fa6'


export default function Page() {

  return (
    <div className='w-full h-screen flex flex-col gap-4 items-center bg-background justify-center'>
      <FaHand className='h-10 w-10'/>
      <h1>Du hast keine Berechtigungen für diese Seite</h1>
    </div>
  )
}
