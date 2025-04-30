import Link from 'next/link'
import React, { useState, useRef, useEffect } from 'react'
import { ThemeSelector } from './theme-selector'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { getAuth, updateProfile } from 'firebase/auth'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, doc, updateDoc, collection, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { FaArrowRightFromBracket } from 'react-icons/fa6'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const tgt = e.target as Node
      if (
        dropdownRef.current?.contains(tgt) ||
        document.querySelector('.theme-dialog')?.contains(tgt)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const auth = getAuth()
  const db = getFirestore()
  const storage = getStorage()

  const [name, setName] = useState<string>(
    () => auth.currentUser?.displayName || ''
  )

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarURL, setAvatarURL] = useState<string>(
    () => auth.currentUser?.photoURL || '/avatar.png'
  )
  const [selectedTheme, setSelectedTheme] = useState<string>(
    () => localStorage.getItem('theme') || 'light'
  )

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return
    const infoRef = doc(db, 'global/users', user.uid, 'info')
    getDoc(infoRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        setName(data.displayName || data.name || '')
      }
    })
  }, [auth, db])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setName(e.target.value)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAvatarFile(e.target.files[0])
  }
  const handleSave = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      let newPhotoURL = avatarURL
      if (avatarFile) {
        const fileRef = storageRef(storage, `/BASIS/USERS/${user.uid}/${avatarFile.name}`)
        await uploadBytes(fileRef, avatarFile)
        newPhotoURL = await getDownloadURL(fileRef)
      }

      await updateProfile(user, {
        displayName: name || user.displayName || '',
        photoURL: newPhotoURL
      })

      const userDocRef = doc(db, 'global/users', user.uid, 'info')
      await updateDoc(userDocRef, {
        displayName: name || auth.currentUser?.displayName || ''
      })

      setAvatarURL(newPhotoURL)
      localStorage.setItem('theme', selectedTheme)
      toast.success('Profil aktualisiert')
      setOpen(false)
    } catch (e:any) {
    toast.error('Probleme beim Aktualisieren: ', { description: user?.uid ? `UserDocRef: global/users/${user.uid}/info` : 'UserDocRef not available' })
    }
  }

  return (
    <div className='w-full h-fit py-2 relative padding-b flex items-center justify-center'>
      <div className='max-w-[1900px] px-4 md:px-12 w-full h-fit flex justify-between items-center'>
        <div className='flex gap-4'>
          <Link href='/dashboard' className='text-sm'>Home</Link>
          <Link href='/dashboard/status' className='text-sm'>Status</Link>
          <Link href='/dashboard/settings' className='text-sm'>Einstellungen</Link>
        </div>

        <div className='relative'>
          <button onClick={() => setOpen(prev => !prev)}>
            <div className='h-8 w-8 border rounded-full overflow-hidden bg-gray-500'>
              <img src={avatarURL} className='h-8 w-8' />
            </div>
          </button>

          {open && (
            <div
              ref={dropdownRef}
              className='absolute right-0 mt-2 w-56 bg-background border rounded shadow-lg z-10'
            >
              <div className='flex flex-col gap-2'>
                <h2 className='mx-4 mt-2 text-semibold'>Mein Account</h2>
                <div className='w-full h-[1px] bg-border'/>

                <label className='text-sm mx-4 mt-2'>
                    Display Name
                    <Input
                        type='text'
                        value={name}
                        placeholder={auth.currentUser?.displayName || 'Name'}
                        onChange={handleNameChange}
                        className='block w-full border rounded px-2 py-1'
                    />
                </label>

                <label className='text-sm mx-4 mt-2'>
                    Avatar
                    <div className='flex gap-2 items-center'>
                        <img
                            src={avatarURL}
                            alt='Avatar'
                            className='h-8 w-8 rounded-full border'
                        />
                        <Input
                          type='file'
                          accept='image/*'
                          onChange={handleAvatarChange}
                          className='block w-full'
                          
                        />
                    </div>
                </label>

                <div onClick={e => e.stopPropagation()} className='mx-4 mt-2'>
                  <label className='text-sm'>Darstellung</label>
                  <ThemeSelector/>
                </div>

                <Button
                  onClick={handleSave}
                  variant="secondary"
                  className='text-white px-2 py-1 rounded text-sm mx-4 my-2'
                >
                  Speichern
                </Button>

                <div className='w-full h-[1px] bg-border'/>

                <Button
                  onClick={() => {
                    auth.signOut()
                    toast.success('Abgemeldet')
                  }}
                  className='text-red-600 px-2 py-1 rounded text-sm mx-4 mt-2 mb-4'
                >
                  <FaArrowRightFromBracket/> Abmelden
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
