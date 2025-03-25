import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from '@/database';
import { FaTrash } from 'react-icons/fa6';
import getRandomId from '@/utils/getRandomId';


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KartenmodulEditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [marks, setMarks] = useState<{ id: string, lat: string, lon: string, color: string, name: string, website: string }[]>([]);
  const [editingMark, setEditingMark] = useState<{ id: string, lat: string, lon: string, color: string, name: string, website: string } | null>(null);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, `product/${productId}/modules/${id}/marks`));
        const marksData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            lat: data.lat || '',
            lon: data.lon || '',
            color: data.color || '#ffffff',
            name: data.name || '',
            website: data.website || ''
          };
        });
        setMarks(marksData);
      } catch (error) {
        toast.error("Die Orte konnten nicht geladen werden.", { description: String(error) });
      }
    };

    fetchMarks();
  }, [productId, id]);

  const handleEdit = (mark: { id: string, lat: string, lon: string, color: string, name: string, website: string }) => {
    setEditingMark(mark);
    setLat(mark.lat);
    setLon(mark.lon);
    setColor(mark.color);
    setName(mark.name);
    setWebsite(mark.website);
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    const newMark = {
      id: editingMark ? editingMark.id : getRandomId(undefined, 8),
      lat,
      lon,
      color,
      name,
      website
    };
    try {
      await setDoc(doc(db, `product/${productId}/modules/${id}/marks`, newMark.id), newMark);
      if (editingMark) {
        setMarks(marks.map(mark => mark.id === newMark.id ? newMark : mark));
        toast.success("Ort aktualisiert", { description: `${newMark.id}` });
      } else {
        setMarks([...marks, newMark]);
        toast.success("Ort erstellt", { description: `${newMark.id}` });
      }
      onChangesSaved();
      setIsSheetOpen(false);
      setEditingMark(null);
    } catch (error) {
      toast.error("Fehler beim Speichern des Ortes", { description: String(error) });
    }
  };

  const handleDelete = async (markId: string) => {
    try {
      await deleteDoc(doc(db, `product/${productId}/modules/${id}/marks`, markId));
      setMarks(marks.filter(mark => mark.id !== markId));
      toast.success("Ort gelöscht", { description: `${markId}` });
      onChangesSaved();
    } catch (error) {
      toast.error("Fehler beim Löschen des Ortes", { description: String(error) });
    }
  };

  const filteredMarks = marks.filter(mark => mark.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className='flex flex-col w-full h-full relative'>
      <div className='w-full gap-4 flex mb-10'>
        <Input placeholder='Suche...' className='text-white placeholder:text-white/40' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <Button variant="secondary" onClick={() => { setIsSheetOpen(true); setLat(''); setLon(''); setColor(''); setName(''); setWebsite('') }}>Ort hinzufügen</Button>
      </div>
      <div className='flex flex-col divide-y divide-white/10 max-h-[777px] overflow-y-scroll'>
        {filteredMarks.map(mark => (
          <div key={mark.id} className='flex items-center gap-4 py-2'>
            <div style={{ backgroundColor: mark.color }} className='w-4 h-4 rounded-sm'></div>
            <span className='flex-1'>{mark.name}</span>
            <Button variant="outline" onClick={() => handleEdit(mark)}>Bearbeiten</Button>
            <Button variant="destructive" onClick={() => handleDelete(mark.id)}><FaTrash/></Button>
          </div>
        ))}
      </div>
      <Sheet open={isSheetOpen} onOpenChange={(open) => {
        setIsSheetOpen(open);
        if (!open) setEditingMark(null);
      }}>
        <SheetContent className='flex flex-col h-full border'>
          <SheetHeader>
            <SheetTitle>Neuen Ort hinzufügen</SheetTitle>
            <SheetDescription>Füllen Sie die folgenden Felder aus, um einen neuen Ort hinzuzufügen.</SheetDescription>
          </SheetHeader>
          <div className='flex h-full flex-col gap-4'>
            <div className='flex gap-4'>
              <Input className='text-white placeholder:text-white/40' placeholder='Latitude' value={lat} onChange={(e) => setLat(e.target.value)} />
              <Input className='text-white placeholder:text-white/40' placeholder='Longitude' value={lon} onChange={(e) => setLon(e.target.value)} />
            </div>
            <div className='flex flex-col gap-2'>
              <HexColorPicker color={color} onChange={setColor} className="custom-pointers"/>
              <Input className='text-white placeholder:text-white/40' placeholder='Farbe' value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <Input className='text-white placeholder:text-white/40' placeholder='Name' value={name} onChange={(e) => setName(e.target.value)} />
            <Input className='text-white placeholder:text-white/40' placeholder='Website' value={website} onChange={(e) => setWebsite(e.target.value)} />
            <Button className='mt-10' onClick={handleSave}>{editingMark ? 'Aktualisieren' : 'Speichern'}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default KartenmodulEditor;