'use client'
import React, { useEffect, useState } from 'react'
import { FaHand } from 'react-icons/fa6'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox component
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import MultipleSelector from '@/components/ui/multiple-selector'; // Import the custom multiple selector
import { Badge } from '@/components/ui/badge'; // Import Badge component
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'; // Import Firestore functions

export default function Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const superAdmins = process.env.NEXT_PUBLIC_SUPERADMINS?.split(',') || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [projectAccess, setProjectAccess] = useState('');
  const [sendPasswordReset, setSendPasswordReset] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState({ date: '', user: '', action: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

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

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            toast.error('Benutzer ist nicht authentifiziert.');
            console.error('Error: Current user is null.');
            return;
          }

          try {
            const idToken = await user.getIdToken();

            const response = await fetch('/api/handleUser', {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              setProjects(data.projects);
            } else {
              const errorData = await response.json();
              console.error('Error fetching projects:', errorData);
              toast.error(`Fehler beim Abrufen der Projekte: ${errorData.error || 'Unbekannter Fehler'}`);
            }
          } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Fehler beim Abrufen der Projekte');
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error initializing Firebase Auth:', error);
        toast.error('Fehler beim Initialisieren der Authentifizierung');
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const db = getFirestore(); // Initialize Firestore

        // Fetch all documents in the 'logs' collection
        const logsCollectionRef = collection(db, 'logs');
        const querySnapshot = await getDocs(logsCollectionRef);

        if (querySnapshot.empty) {
          console.warn('No logs found in the logs collection.');
          setLogs([]);
          setFilteredLogs([]);
          return;
        }

        const allLogs: any[] = [];

        // Iterate through each document in the 'logs' collection
        for (const docSnapshot of querySnapshot.docs) {
          const date = docSnapshot.id; // Document ID represents the date
          const logsData = docSnapshot.data().logs || []; // Extract the logs array

          // Fetch emails for each log
          const logsWithEmails = await Promise.all(
            logsData.map(async (log: any) => {
              if (!log.uid) {
                console.warn(`Log is missing a UID. Skipping.`);
                return { ...log, email: 'Unknown', date }; // Include the date for each log
              }

              const userDocRef = doc(db, 'global/users', log.uid, 'info');
              const userDocSnapshot = await getDoc(userDocRef);

              if (!userDocSnapshot.exists()) {
                console.warn(`No user found for UID ${log.uid}.`);
                return { ...log, email: 'Unknown', date }; // Include the date for each log
              }

              const userData = userDocSnapshot.data();
              return { ...log, email: userData.email || 'Unknown', date }; // Include the date for each log
            })
          );

          allLogs.push(...logsWithEmails); // Add logs from this date to the overall list
        }

        // Sort logs by timestamp (newest to oldest)
        const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(sortedLogs);
        setFilteredLogs(sortedLogs);
      } catch (error) {
        console.error('Error fetching logs from Firestore:', error);
        toast.error('Fehler beim Abrufen der Logs');
      }
    };

    fetchLogs();
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

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/handleUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          email: userEmail,
          projectAccess: selectedProjects.length === projects.length ? ['all'] : selectedProjects,
          sendPasswordReset
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Nutzer erfolgreich erstellt', { description: data.message });
      } else {
        const errorData = await response.json();
        toast.error('Fehler beim Erstellen des Nutzers', { description: errorData.error });
      }
    } catch (error: any) {
      toast.error('Fehler beim Erstellen des Nutzers', { description: error });
    }

    setIsUserModalOpen(false);
  };

  const handleSelectAllProjects = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]); 
    } else {
      setSelectedProjects(projects.map((project) => project.id));
    }
  };

  const handleSearch = () => {
    const filtered = logs.filter((log) => {
      const matchesDate = searchQuery.date ? log.timestamp.startsWith(searchQuery.date) : true;
      const matchesUser = searchQuery.user ? log.email.includes(searchQuery.user) : true;
      const matchesAction = searchQuery.action ? log.action.includes(searchQuery.action) : true;
      return matchesDate && matchesUser && matchesAction;
    });

    // Sort logs by timestamp (newest to oldest)
    const sortedLogs = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFilteredLogs(sortedLogs);
    setCurrentPage(1);
  };

  const getBadgeColor = (action: string) => {
    switch (action) {
      case 'userCreate':
        return 'bg-blue-500/70 text-white';
      case 'DeleteProduct':
        return 'bg-red-500/70 text-white';
      case 'DeleteModule':
        return 'bg-orange-500/70 text-white';
      case 'KillSwitchActivated':
        return 'bg-red-500/70 text-white';
      default:
        return 'bg-gray-500/70 text-white';
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const displayedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  return (
    <div className='w-full h-screen flex flex-col gap-4 items-center bg-background justify-center'>
      {isSuperAdmin ? (
        <div className='max-w-[1900px] w-full p-4 md:p-12 flex flex-col gap-12'>
          <div className='w-full h-fit'>
            <h1 className='font-semibold text-lg'>Nutzer erstellen</h1>
            <p className='text-sm text-neutral-300'>Erstellen Sie Nutzer ausschließlich mit einer gültigen E-Mail-Adresse.</p>

            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className='mt-4'>Nutzer hinzufügen</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nutzer erstellen</DialogTitle>
                  <DialogDescription>Hinterlege eine E-Mail-Adresse und die zugehörigen Projekte.</DialogDescription>
                </DialogHeader>
                <Input
                  placeholder='E-Mail-Adresse'
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
                <div className='mt-4'>
                  <label className='block text-sm font-medium'>Projekte</label>
                  <MultipleSelector
                    value={projects
                      .filter((project) => selectedProjects.includes(project.id))
                      .map((project) => ({ value: project.id, label: project.name }))}
                    options={[
                      { value: 'all', label: 'Alle auswählen' },
                      ...projects.map((project) => ({
                        value: project.id,
                        label: project.name,
                      })),
                    ]}
                    onChange={(selected) => {
                      if (selected.some((item) => item.value === 'all')) {
                        handleSelectAllProjects();
                      } else {
                        setSelectedProjects(selected.map((item) => item.value));
                      }
                    }}
                    placeholder="Projekte auswählen"
                  />
                </div>
                <div className='flex items-center gap-2 mt-2'>
                  <Checkbox
                    checked={sendPasswordReset}
                    onCheckedChange={(checked) => setSendPasswordReset(!!checked)}
                  />
                  <label>Passwort-Reset senden</label>
                </div>
                <DialogFooter className='w-full flex flex-col justify-between'>
                  <Button variant="outline" className='mr-auto' onClick={() => setIsUserModalOpen(false)}>Abbrechen</Button>
                  <Button variant="destructive" onClick={handleCreateUser}>Bestätigen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className='w-full h-fit'>
            <h1 className='font-semibold text-lg'>Aktivitäten</h1>
            <div className='flex gap-2 mt-4'>
              <Input
                placeholder='Datum (YYYY-MM-DD)'
                value={searchQuery.date}
                onChange={(e) => setSearchQuery({ ...searchQuery, date: e.target.value })}
              />
              <Input
                placeholder='Benutzer (E-Mail)'
                value={searchQuery.user}
                onChange={(e) => setSearchQuery({ ...searchQuery, user: e.target.value })}
              />
              <Input
                placeholder='Aktion'
                value={searchQuery.action}
                onChange={(e) => setSearchQuery({ ...searchQuery, action: e.target.value })}
              />
              <Button onClick={handleSearch}>Suchen</Button>
            </div>
            <div className='mt-4'>
              {displayedLogs.map((log, index) => (
                <div key={index} className='flex items-center justify-between p-2 border-b'>
                  <Badge className={getBadgeColor(log.action)}>{log.action}</Badge>
                  <span>{log.email}</span>
                  <span>{new Date(log.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
            <div className='flex justify-between items-center mt-4'>
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Zurück
              </Button>
              <span>
                Seite {currentPage} von {Math.ceil(filteredLogs.length / logsPerPage)}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === Math.ceil(filteredLogs.length / logsPerPage)}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Weiter
              </Button>
            </div>
          </div>
          <div className='w-full h-fit'>
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
        </div>
      ) : (
        <>
          <FaHand className='h-10 w-10'/>
          <h1>Du hast keine Berechtigungen für diese Seite</h1>
        </>
      )}
    </div>
  );
}
