'use client'
import React, { useEffect, useState } from 'react'
import { FaHand } from 'react-icons/fa6'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox'; 
import MultipleSelector from '@/components/ui/multiple-selector';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';


export default function Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [sendPasswordReset, setSendPasswordReset] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isKillSwitchModalOpen, setIsKillSwitchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [users, setUsers] = useState<{ uid: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ uid: string; email: string } | null>(null);
  const superAdmins = process.env.NEXT_PUBLIC_SUPERADMINS?.split(',') || [];
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/handleUser', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        } else {
          const errorData = await response.json();
          toast.error('Fehler beim Abrufen der Nutzer', { description: errorData.error });
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Fehler beim Abrufen der Nutzer');
      }
    };

    fetchUsers();
  }, []);

   useEffect(() => {
    const fetchProjects = async () => {
      try {
        const db = getFirestore();
        const productsSnapshot = await getDocs(collection(db, 'product'));
        const fetchedProjects = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Fehler beim Abrufen der Projekte');
      }
    };

    fetchProjects();
  }, []);


  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const db = getFirestore();
        const logsCollectionRef = collection(db, 'logs');
        const querySnapshot = await getDocs(logsCollectionRef);

        if (querySnapshot.empty) {
          console.warn('No logs found in the logs collection.');
          setLogs([]);
          setFilteredLogs([]);
          return;
        }

        const allLogs: any[] = [];

        for (const docSnapshot of querySnapshot.docs) {
          const date = docSnapshot.id;
          const logsData = docSnapshot.data().logs || [];

          const logsWithEmails = await Promise.all(
            logsData.map(async (log: any) => {
              if (!log.uid) {
                return { ...log, email: 'Unknown', date };
              }

              const userDocRef = doc(db, 'global/users', log.uid, 'info');
              const userDocSnapshot = await getDoc(userDocRef);

              if (!userDocSnapshot.exists()) {
                return { ...log, email: 'Unknown', date };
              }

              const userData = userDocSnapshot.data();
              return { ...log, email: userData.email || 'Unknown', date };
            })
          );

          allLogs.push(...logsWithEmails);
        }

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

   useEffect(() => {
    const fetchProjects = async () => {
      try {
        const db = getFirestore();
        const productsSnapshot = await getDocs(collection(db, 'product'));
        const fetchedProjects = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setProjects(fetchedProjects);
        console.log('Fetched projects from Firestore:', fetchedProjects);
      } catch (error) {
        console.error('Error fetching projects from Firestore:', error);
        toast.error('Fehler beim Abrufen der Projekte');
      }
    };

    fetchProjects();
  }, []);


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
        toast.success('Nutzer erfolgreich erstellt');
        setUserEmail('');
        setSelectedProjects([]);
        setSendPasswordReset(false);
        setIsUserModalOpen(false);
        const updatedUsers = await response.json();
        setUsers(updatedUsers.users);
      } else {
        const errorData = await response.json();
        toast.error('Fehler beim Erstellen des Nutzers', { description: errorData.error });
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Nutzers');
    }
  };

  const handleActivateKillSwitch = async () => {
    try {
      const response = await fetch('/api/killSwitch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`
        }
      });

      if (response.ok) {
        toast.success('Kill Switch aktiviert');
      } else {
        const errorData = await response.json();
        toast.error('Fehler beim Aktivieren des Kill Switch', { description: errorData.error });
      }
    } catch (error) {
      toast.error('Fehler beim Aktivieren des Kill Switch');
    }

    setIsKillSwitchModalOpen(false);
  };

  const handleEditUser = (user: { uid: string; email: string }) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleResetPassword = async () => {
    try {
      const response = await fetch('/api/handleUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          action: 'resetPassword',
          uid: selectedUser?.uid,
        })
      });

      if (response.ok) {
        toast.success('Passwort-Reset-Link gesendet');
        setIsEditModalOpen(false);
      } else {
        const errorData = await response.json();
        toast.error('Fehler beim Senden des Passwort-Reset-Links', { description: errorData.error });
      }
    } catch (error) {
      toast.error('Fehler beim Senden des Passwort-Reset-Links');
    }
  };

  const handleDeactivateUser = async () => {
    try {
      const response = await fetch('/api/handleUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          action: 'deactivateUser',
          uid: selectedUser?.uid,
        })
      });

      if (response.ok) {
        toast.success('Nutzer deaktiviert');
        setUsers(users.filter((user) => user.uid !== selectedUser?.uid));
        setIsEditModalOpen(false);
      } else {
        const errorData = await response.json();
        toast.error('Fehler beim Deaktivieren des Nutzers', { description: errorData.error });
      }
    } catch (error) {
      toast.error('Fehler beim Deaktivieren des Nutzers');
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await fetch('/api/handleUser', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          uid: selectedUser?.uid,
        })
      });

      if (response.ok) {
        toast.success('Nutzer gelöscht');
        setUsers(users.filter((user) => user.uid !== selectedUser?.uid));
        setIsEditModalOpen(false);
      } else {
        const errorData = await response.json();
        toast.error('Fehler beim Löschen des Nutzers', { description: errorData.error });
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Nutzers');
    }
  };

  const handleSelectAllProjects = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map((project) => project.id));
    }
  };


  const displayedLogs = filteredLogs;
  const isSuperAdmin = userId ? superAdmins.includes(userId) : false;

  return (
    <div className='w-full min-h-screen flex flex-col gap-4 items-center justify-center bg-background'>
      {isSuperAdmin ? (
        <div className='max-w-[1900px] w-full p-4 md:p-12 flex flex-col divide-y divide-neutral-800'>
          <div className='w-full h-fit py-12'>
            <h1 className='font-semibold text-lg'>Nutzer erstellen</h1>
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
                      ?.filter((project) => selectedProjects.includes(project.id)) 
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
                    placeholder={projects.length > 0 ? "Projekte auswählen" : "Keine Projekte verfügbar"} // Safeguard for empty data
                  />
                </div>
                <div className='flex items-center gap-2 mt-2'>
                  <Checkbox
                    checked={sendPasswordReset}
                    onCheckedChange={(checked) => setSendPasswordReset(!!checked)}
                  />
                  <label>Passwort-Reset senden</label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>Abbrechen</Button>
                  <Button variant="destructive" onClick={handleCreateUser}>Bestätigen</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className='mt-8'>
              <h2 className='font-semibold text-lg'>Nutzerliste</h2>
              <Table className='mt-4'>
                <TableCaption>Eine Liste aller Nutzer.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-Mail</TableHead>
                    <TableHead className="max-w-[130px] w-[130px]">UID</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                      <TableRow key={user.uid} className="border-b">
                        <TableCell className="p-2">{user.email}</TableCell>
                        <TableCell className="p-2 max-w-[130px] w-[130px] overflow-hidden">{user.uid}</TableCell>
                        <TableCell className="p-2 flex justify-end">
                          <Button variant="outline" onClick={() => handleEditUser(user)}>
                            Bearbeiten
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className='w-full h-fit py-12'>
            <h1 className='font-semibold text-lg'>Aktivitäten</h1>
            <div className='mt-4'>
              <Table>
                <TableCaption>Eine Liste aller Aktivitäten.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="">Aktion</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Email</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className='max-h-[400px] h-[400px] overflow-scroll'>
                  {displayedLogs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium"><Badge>{log.action}</Badge></TableCell>
                      <TableCell><span>{new Date(log.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</span></TableCell>
                      <TableCell className='text-right'><span>{log.email}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nutzer bearbeiten</DialogTitle>
                <DialogDescription>Bearbeiten Sie die Optionen für den Nutzer {selectedUser?.email}.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <Button variant="outline" onClick={handleResetPassword}>Passwort zurücksetzen</Button>
                <Button onClick={handleDeactivateUser}>Nutzer deaktivieren</Button>
                <Button variant="destructive" onClick={handleDeleteUser}>Nutzer löschen</Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Abbrechen</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className='w-full h-fit py-12'>
            <h1 className='font-semibold text-lg'>Kill Switch</h1>
            <p className='text-sm text-neutral-300'>Sobald diese Funktion ausgeführt wird, sind alle Lesevorgänge für Nutzer eingeschränkt, und sämtliche Module werden für sie nicht mehr sichtbar.</p>
            <Dialog open={isKillSwitchModalOpen} onOpenChange={setIsKillSwitchModalOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className='mt-4'>Aktivieren</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kritische Aktion ausführen?</DialogTitle>
                  <DialogDescription>Diese Aktion kann nicht rückgängig gemacht werden und sollte nur in dringenden Sicherheitsfällen bestätigt werden.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsKillSwitchModalOpen(false)}>Abbrechen</Button>
                  <Button variant="destructive" onClick={handleActivateKillSwitch}>Bestätigen</Button>
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

