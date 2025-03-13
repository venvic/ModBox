import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '../ui/label';
import { getDoc, setDoc, doc, getFirestore, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/database';
import { initializeApp } from 'firebase/app';
import { Switch } from "@/components/ui/switch";
import { Button } from '../ui/button';
import { FaGear } from 'react-icons/fa6';
import { Checkbox } from '../ui/checkbox';

const db = getFirestore(initializeApp(firebaseConfig));

const daysOfWeek = [
  { name: 'Montag', sort: 1 },
  { name: 'Dienstag', sort: 2 },
  { name: 'Mittwoch', sort: 3 },
  { name: 'Donnerstag', sort: 4 },
  { name: 'Freitag', sort: 5 },
  { name: 'Samstag', sort: 6 },
  { name: 'Sonntag', sort: 7 },
];

type OpeningTime = {
  name: string;
  sort: number;
  open: string;
  close: string;
  closed: boolean;
  break: { start: string; end: string }[];
};

const OeffnungszeitenEditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
  const [openingTimes, setOpeningTimes] = useState<OpeningTime[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDay, setCurrentDay] = useState<OpeningTime | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const timesCollectionRef = collection(db, `product/${productId}/modules/${id}/times`);
      const timesQuery = query(timesCollectionRef);
      const timesSnapshot = await getDocs(timesQuery);
      if (!timesSnapshot.empty) {
        const timesData = timesSnapshot.docs.map(doc => doc.data() as OpeningTime);
        setOpeningTimes(timesData.sort((a, b) => a.sort - b.sort));
      } else {
        const initialTimes = daysOfWeek.map(day => ({
          ...day,
          open: '08:00',
          break: [{ start: '00:00', end: '00:00' }],
          close: '18:00',
          closed: false,
        }));
        setOpeningTimes(initialTimes);
        // Create the times in the database
        await Promise.all(initialTimes.map(async (time) => {
          const timeDocRef = doc(timesCollectionRef, time.name);
          await setDoc(timeDocRef, time);
        }));
      }
    };
    fetchData();
  }, [id, productId]);

  const handleTimeChange = (dayIndex: number, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    const newOpeningTimes = [...openingTimes];
    newOpeningTimes[dayIndex][field as keyof OpeningTime] = value as never;
    if (field === 'closed' && value === true) {
      newOpeningTimes[dayIndex].open = '';
      newOpeningTimes[dayIndex].close = '';
    }
    setOpeningTimes(newOpeningTimes);
    setHasChanges(true);
  };

  const handleBreakChange = (dayIndex: number, breakIndex: number, field: 'start' | 'end', value: string) => {
    const newOpeningTimes = [...openingTimes];
    newOpeningTimes[dayIndex].break[breakIndex][field] = value;
    setOpeningTimes(newOpeningTimes);
    setHasChanges(true);
  };

  const handleBreakToggle = (dayIndex: number, enabled: boolean) => {
    const newOpeningTimes = [...openingTimes];
    if (!enabled) {
      newOpeningTimes[dayIndex].break = [{ start: '00:00', end: '00:00' }];
    } else {
      newOpeningTimes[dayIndex].break = [{ start: '12:00', end: '13:00' }];
    }
    setOpeningTimes(newOpeningTimes);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const timesCollectionRef = collection(db, `product/${productId}/modules/${id}/times`);
    await Promise.all(openingTimes.map(async (time) => {
      const timeDocRef = doc(timesCollectionRef, time.name);
      await setDoc(timeDocRef, {
        ...time,
        open: time.open ? time.open : '00:00',
        close: time.close ? time.close : '00:00',
        break: time.break.map(brk => ({
          start: brk.start ? brk.start : '00:00',
          end: brk.end ? brk.end : '00:00',
        })),
      });
    }));
    onChangesSaved();
    setHasChanges(false);
    setIsDialogOpen(false);
  };

  return (
    <div className='w-full h-full relative divide-y divide-white/10'>
      {openingTimes.map((day, index) => (
        <div key={day.sort} className={`flex items-center justify-between py-3 w-full ${day.closed ? 'opacity-50' : ''}`}>
          <div className='flex items-center gap-4'>
            <Switch
              checked={!day.closed}
              onCheckedChange={(checked) => handleTimeChange(index, 'closed', !checked)}
            />
            <h3 className='text-white'>{day.name}</h3>
          </div>
          <Button onClick={() => { setCurrentDay(day); setIsDialogOpen(true); }}>
            <FaGear />
          </Button>
        </div>
      ))}
      {hasChanges && <Button variant="secondary" onClick={handleSave} className='absolute bottom-4 right-4'>Save</Button>}
      {isDialogOpen && currentDay && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>Bearbeite {currentDay.name}</DialogTitle>
            <DialogDescription className='text-white/40'>
              <Label>Öffnung:</Label>
              <Input
                type="time"
                value={currentDay.open}
                onChange={(e) => {
                  const newDay = { ...currentDay, open: e.target.value };
                  setCurrentDay(newDay);
                  handleTimeChange(currentDay.sort - 1, 'open', e.target.value);
                }}
                disabled={currentDay.closed}
                className='text-white placeholder:text-white/40 mt-1 mb-4'
                step="900" // 15-minute intervals
                pattern="[0-9]{2}:[0-9]{2}" // 24-hour format
              />
              <Label>Schließung:</Label>
              <Input
                type="time"
                value={currentDay.close}
                onChange={(e) => {
                  const newDay = { ...currentDay, close: e.target.value };
                  setCurrentDay(newDay);
                  handleTimeChange(currentDay.sort - 1, 'close', e.target.value);
                }}
                disabled={currentDay.closed}
                className='text-white placeholder:text-white/40 mt-1 mb-4'
                step="900" // 15-minute intervals
                pattern="[0-9]{2}:[0-9]{2}" // 24-hour format
              />
              <div className='flex gap-3 items-center mb-4'>
                <Checkbox
                  checked={currentDay.break[0].start !== '00:00' || currentDay.break[0].end !== '00:00'}
                  onCheckedChange={(checked: boolean) => {
                    const newDay = { ...currentDay };
                    if (!checked) {
                      newDay.break = [{ start: '00:00', end: '00:00' }];
                    } else {
                      newDay.break = [{ start: '12:00', end: '13:00' }]; // Default break time
                    }
                    setCurrentDay(newDay);
                    handleBreakToggle(currentDay.sort - 1, checked);
                  }}
                />
                <p>Zweite Öffnungszeiten</p>
              </div>
              {currentDay.break.map((brk, breakIndex) => (
                <div key={breakIndex}>
                  <Label>Öffnung:</Label>
                  <Input
                    type="time"
                    value={brk.start}
                    onChange={(e) => {
                      const newBreak = [...currentDay.break];
                      newBreak[breakIndex].start = e.target.value;
                      const newDay = { ...currentDay, break: newBreak };
                      setCurrentDay(newDay);
                      handleBreakChange(currentDay.sort - 1, breakIndex, 'start', e.target.value);
                    }}
                    className='text-white placeholder:text-white/40 mt-1 mb-4'
                    step="900" // 15-minute intervals
                    pattern="[0-9]{2}:[0-9]{2}" // 24-hour format
                    disabled={brk.start === '00:00' && brk.end === '00:00'}
                  />
                  <Label>Schließung:</Label>
                  <Input
                    type="time"
                    value={brk.end}
                    onChange={(e) => {
                      const newBreak = [...currentDay.break];
                      newBreak[breakIndex].end = e.target.value;
                      const newDay = { ...currentDay, break: newBreak };
                      setCurrentDay(newDay);
                      handleBreakChange(currentDay.sort - 1, breakIndex, 'end', e.target.value);
                    }}
                    className='text-white placeholder:text-white/40 mt-1 mb-4'
                    step="900" // 15-minute intervals
                    pattern="[0-9]{2}:[0-9]{2}" // 24-hour format
                    disabled={brk.start === '00:00' && brk.end === '00:00'}
                  />
                </div>
              ))}
            </DialogDescription>
            <DialogFooter>
              <DialogClose asChild>
                <Button onClick={() => setIsDialogOpen(false)}>Schließen</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default OeffnungszeitenEditor;