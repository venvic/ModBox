'use client'
import { firebaseConfig } from '@/database';
import { getApps, initializeApp } from 'firebase/app';
import { doc, getFirestore, getDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Progress } from './ui/progress';
import FilialfinderEditor from './editors/FilialfinderEditor';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from "@/database";
import { useRouter } from 'next/navigation';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Dialog, DialogTitle, DialogContent, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import { FaChevronLeft, FaRegClone } from 'react-icons/fa6';
import PDFeditor from './editors/PDFeditor';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import KartenmodulEditor from './editors/KartenmodulEditor';
import OeffnungszeitenEditor from './editors/OeffnungszeitenEditor';
import FormularmodulEditor from './editors/Formularmoduleditor';
import { deleteObject } from 'firebase/storage';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from './ui/navigation-menu';
import TerminalEditor from './editors/TerminalEditor';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();


const getEditorComponent = (productId:string, id:string, type: string, onChangesSaved: () => void) => {
  switch (type) {
    case 'Filialfinder':
      return <FilialfinderEditor productId={productId} id={id} onChangesSaved={onChangesSaved} />;
    case 'Kartenmodul':
      return <KartenmodulEditor productId={productId} id={id} onChangesSaved={onChangesSaved}  />;
    case 'PDF-Modul':
      return <PDFeditor id={id} productId={productId} onChangesSaved={onChangesSaved} />;
    case 'Offnungszeiten':
      return <OeffnungszeitenEditor id={id} productId={productId} onChangesSaved={onChangesSaved} />;
    case 'Formular-Modul':
      return <FormularmodulEditor id={id} productId={productId} onChangesSaved={onChangesSaved} />;
    case 'Terminal-Modul':
      return <TerminalEditor id={id} productId={productId} onChangesSaved={onChangesSaved} />;
    default:
      return <div>Unknown module type</div>;
  }
};

export const ModuleDetails = ({ productId, moduleId }: { productId: string, moduleId: string }) => {
  const [module, setModule] = useState<{ name: string; type: string; description: string; settings: string; privacy?: string } | null>(null);
  const [product, setProduct] = useState<{ name: string; slug: string; id: string } | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [modules, setModules] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [settings, setSettings] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const router = useRouter();

  const handleChangesSaved = () => {
    setIframeKey(prevKey => prevKey + 1);
  };

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setTimeout(() => {
          setLoading(false);
        }, 1100);
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const productDoc = await getDoc(doc(db, `product`, productId));
        if (productDoc.exists()) {
          const productData = productDoc.data() as { name: string; slug: string };
          setProduct({ name: productData.name, slug: productData.slug, id: productId });

          const moduleDoc = await getDoc(doc(db, `product/${productId}/modules`, moduleId));
          if (moduleDoc.exists()) {
            const moduleData = moduleDoc.data() as { name: string; type: string; privacy: string; description: string; settings: string };
            setModule(moduleData);
            setName(moduleData.name);
            setDescription(moduleData.description);
            setPrivacy(moduleData.privacy);
            setSettings(moduleData.settings);
          } else {
            console.error('Module not found');
          }
        } else {
          console.error('Product not found');
        }
      } catch (error) {
        console.error('Error fetching module: ', error);
      } finally {
        setTimeout(() => setLoading(false), 410)
      }
    };

    fetchModule();
  }, [productId, moduleId]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'product'));
        const productsList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, name: data.name };
        });
        setProducts(productsList);
      } catch (error) {
        console.error('Error fetching products: ', error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, `product/${productId}/modules`));
        const modulesList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, name: data.name };
        });
        setModules(modulesList);
      } catch (error) {
        console.error('Error fetching modules: ', error);
      }
    };

    fetchModules();
  }, [productId]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 10 : 100));
      }, 110);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleSave = async () => {
    if (module) {
      try {
        const updateData: any = {
          name,
          description,
          settings
        };
        if (module.type === 'Formular-Modul' && privacy !== undefined) {
          updateData.privacy = privacy;
        }
        await updateDoc(doc(db, `product/${productId}/modules`, moduleId), updateData);
        toast.success('Module erfolgreich aktualisiert');
        setOpenSettingsDialog(false);
        handleChangesSaved(); // Refresh iframe
      } catch (error) {
        toast.error('Fehler beim Speichern', { description: `${error}` });
        console.error('Error updating module: ', error);
      }
    }
  };

  const deleteCollection = async (collectionRef: any) => {
    const snapshot = await getDocs(collectionRef);
    const batch = writeBatch(db);
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  };

  const deleteDocumentWithSubcollections = async (docRef: any, moduleType: string) => {
    let subcollectionNames: string[] = [];
  
    switch (moduleType) {
      case 'Filialfinder':
        subcollectionNames = ['categories'];
        break;
      case 'Kartenmodul':
        subcollectionNames = ['marks'];
        break;
      case 'PDF-Modul':
        subcollectionNames = ['files'];
        break;
      case 'Offnungszeiten':
        subcollectionNames = ['times'];
        break;
      case 'Formular-Modul':
        subcollectionNames = ['data', 'recipients'];
        break;
      case 'Terminal-Modul':
        subcollectionNames = ['tiles', 'settings/default'];
        break;
      default:
        console.error('Unknown module type');
        return;
    }
  
    for (const subcollectionName of subcollectionNames) {
      const subcollections = await getDocs(collection(docRef, subcollectionName));
      for (const subcollection of subcollections.docs) {
        await deleteCollection(collection(docRef, subcollection.id));
      }
    }

    // Check if subcollections are deleted
    for (const subcollectionName of subcollectionNames) {
      const subcollections = await getDocs(collection(docRef, subcollectionName));
      if (!subcollections.empty) {
        for (const subcollection of subcollections.docs) {
          await deleteCollection(collection(docRef, subcollection.id));
        }
      }
    }

    await deleteDoc(docRef);
  };
  
  const handleDelete = async () => {
    setLoading(true);
    try {
      const moduleRef = doc(db, `product/${productId}/modules`, moduleId);
      if (module) {
        await deleteDocumentWithSubcollections(moduleRef, module.type);
      }
      toast.success('Module erfolgreich gelöscht');
      router.push(`/dashboard/${productId}/`);
    } catch (error) {
      toast.error('Fehler beim löschen', { description: `${error}` });
      console.error('Error deleting module: ', error);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!module) return false;
    return (
      name !== module.name ||
      description !== module.description ||
      settings !== module.settings ||
      (module.type === 'Formular-Modul' && privacy !== module.privacy)
    );
  };

  if (loading) {
    return (
      <div className='absolute h-screen w-screen flex items-center justify-center bg-background top-0 left-0'>
        <Progress value={progress} className='w-1/3' />
      </div>
    );
  }

  const iframeSrc = product?.slug
    ? process.env.NODE_ENV === 'production'
      ? `https://heimatinfo.web.app/live/${product.slug}/${moduleId}`
      : `http://localhost:3000/live/${product.slug}/${moduleId}`
    : '';

  return (
    <div className='bg-background min-h-screen min-w-screen w-full h-full justify-center flex'>
      <div className='max-w-[1900px] w-full p-4 md:p-12'>
        {module ? (
          <div className='flex flex-col w-full'>
            <div className='w-full h-fit mb-8 flex justify-between'>
              <div className='flex w-fit gap-4'>
                  <Button onClick={() => router.push(`/dashboard/${productId}/`)}>
                    <FaChevronLeft />
                  </Button>
                  <NavigationMenu>
                    <NavigationMenuList>
                      <NavigationMenuItem>
                        <NavigationMenuTrigger className='text-base font-medium'>{module?.name}</NavigationMenuTrigger>
                        <NavigationMenuContent className='divide-y divide-white/10'>
                          {modules.map((mod) => (
                            <NavigationMenuLink className='flex flex-row min-w-44 w-fit hover:bg-primary bg-card-foreground border-border text-white text-sm py-2 px-3 cursor-pointer' key={mod.id} onClick={() => router.push(`/dashboard/${productId}/modules/${mod.id}`)}>
                              {mod.name}
                            </NavigationMenuLink>
                          ))}
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    </NavigationMenuList>
                  </NavigationMenu>
              </div>

              <div className='w-fit flex gap-4'>
                <Button onClick={() => { navigator.clipboard.writeText(`https://heimatinfo.web.app/live/${product?.slug}/${moduleId}`); toast('Link in die Zwischenablage kopiert!', {description: `https://heimatinfo.web.app/live/${product?.slug}/${moduleId}`});}}>
                  <FaRegClone />Link Kopieren
                </Button>
                <Button variant='secondary' onClick={() => setOpenSettingsDialog(true)}>Einstellungen</Button>
              </div>
            </div>

            <div className='flex flex-col w-full'>
              <div className='text-white h-fit w-full flex'>
                <div className='w-full md:pr-4'>
                  {getEditorComponent(productId, moduleId, module.type, handleChangesSaved)}
                </div>
                <div className='min-w-[390px] h-[852px] w-[393px] hidden md:block'>
                  {iframeLoading && <Skeleton className='h-full w-full rounded-2xl' />}
                  <iframe key={iframeKey} className='h-full w-full rounded-2xl' src={iframeSrc} onLoad={handleIframeLoad} style={{ display: iframeLoading ? 'none' : 'block' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='text-white text-center mt-8 h-full w-full flex items-center justify-center flex-col gap-2'>
            <p>Module not found</p>
          </div>
        )}

        {openSettingsDialog && (
          <Dialog open={openSettingsDialog} onOpenChange={() => setOpenSettingsDialog(false)}>
            <DialogContent>
              <VisuallyHidden>
                <DialogTitle>Modul Einstellungen</DialogTitle>
              </VisuallyHidden>
              <h1 className='mb-6 font-semibold'>Modul Einstellungen</h1>
              <Label>Modul Name</Label>
              <Input className='mb-4 mt-1 w-full text-white placeholder:text-neutral-100/80' value={name} onChange={(e) => setName(e.target.value)} placeholder='Modulname'/>

              <Label>Modul Beschreibung</Label>
              {module && module.type === 'PDF-Modul' ? (
                <Textarea className='mb-4 mt-1 w-full text-white placeholder:text-neutral-100/80' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Beschreibung'/>
              ) : (
                <Input className='mb-4 mt-1 w-full text-white placeholder:text-neutral-100/80' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Beschreibung'/>
              )}

              {module && module.type === 'Formular-Modul' && (
                <>
                  <Label>Datenschutzerklärung</Label>
                  <Input className='mb-4 mt-1 w-full text-white placeholder:text-neutral-100/80' value={privacy} onChange={(e) => setPrivacy(e.target.value)} placeholder='Datenschutzerklärung URL'/>
                </>
              )}

              <Label>Modul Farbe</Label>
              <Input className='mb-4 mt-1 w-full text-white placeholder:text-neutral-100/80' value={settings} onChange={(e) => setSettings(e.target.value)} placeholder='#000000'/>
              
              <div className='w-full flex justify-between'>
                {hasChanges() ? (
                  <Button variant='secondary' onClick={handleSave}>Speichern</Button>
                ) : (
                  <Button onClick={() => setOpenSettingsDialog(false)}>Schließen</Button>
                )}
                <Button variant='destructive' onClick={() => setOpenDialog(true)}>Modul Löschen</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {openDialog && (
          <Dialog open={openDialog} onOpenChange={() => setOpenDialog(false)}>
            <DialogContent>
              <DialogTitle>Modul Löschen?</DialogTitle>
              <p className='text-sm'>Sind Sie sicher, dass Sie dieses Modul löschen möchten?</p>

              <div className='flex w-full justify-between mt-4'>
                <Button onClick={() => setOpenDialog(false)}>Abbrechen</Button>
                <Button variant='destructive' onClick={handleDelete}>Löschen</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};