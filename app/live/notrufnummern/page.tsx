import React from 'react'
import { MdChevronRight, MdPhone } from 'react-icons/md';

interface NumberBlockProps {
    name: string;
    phone: string;
}

const NumberBlock: React.FC<NumberBlockProps> = ({ name, phone }) => {
    return (
        <a href={`tel:${phone}`} className='mb-6 px-5 py-4 rounded-lg shadow bg-white flex gap-4 items-center'>
            <MdPhone className='fill-blue-500 h-6 w-6'/>
            <div>
                <h2 className='text-blue-500 text-sm'>{name}</h2>
                <p className='text-neutral-700'>{phone}</p>
            </div>
            <MdChevronRight className='fill-blue-500/60 h-6 w-6 ml-auto'/>
        </a>
    );
}

export default function Page() {
  return (
    <div className='p-4 flex flex-col min-h-screen bg-slate-50'>
        <div className='w-full flex flex-col p-4 bg-white shadow rounded-lg mb-20'>
            <h1 className='text-lg font-medium text-neutral-800'>Notrufnummer</h1>
            <p className='text-sm text-black/70'>Im Notfall ist es wichtig, schnell und entschlossen zu handeln. Ein paar Ziffern, die Leben retten:</p>
        </div>

        <NumberBlock name="Feuerwehr & Krankenwagen" phone="112"/>
        <NumberBlock name="Polizei" phone="110"/>
        <NumberBlock name="Ärztlicher Notdienst" phone="116117"/>
        <NumberBlock name="Apotheken Notdienst" phone="22833"/>
        <NumberBlock name="Giftnotruf Bayern" phone="089 19240"/>
        <NumberBlock name="Nummer gegen Kummer" phone="116111"/>
        <NumberBlock name="Behördenrufnummer" phone="115"/>
        <NumberBlock name="Telefonseelsorge" phone="0800 1110111"/>
        <NumberBlock name="Leben ohne Sucht" phone="0151 14071130"/>
        <NumberBlock name="Selbsthilfekontaktstelle" phone="0961 3893163"/>
    </div>
  )
}