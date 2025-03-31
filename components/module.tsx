'use client'
import { auth, firebaseConfig } from '@/database';
import { getApps, initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc, getDoc, getDocs, collection, updateDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { FaCloudBolt, FaOutdent, FaMapLocationDot, FaFilePdf, FaClock, FaClipboardList, FaGear, FaChevronLeft, FaTablet, FaPhone } from "react-icons/fa6";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Textarea } from './ui/textarea';
import { SelectValue } from '@radix-ui/react-select';
import { Map, Marker, MapType, ColorScheme, FeatureVisibility } from 'mapkit-react';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import getRandomId from '@/utils/getRandomId';
import handleDelete from '@/utils/dataHandler';

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

const fetchCoordinates = async (city: string) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?city=${city}&country=Germany&format=json`);
  const data = await response.json();
  if (data.length > 0) {
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  }
  return null;
};

const MapDialog = ({ isOpen, onClose, onSelectLocation, slug }: { isOpen: boolean, onClose: () => void, onSelectLocation: (location: { latitude: number, longitude: number }) => void, slug: string }) => {
  const token = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_PROD_MAPKIT_TOKEN || '' : process.env.NEXT_PUBLIC_DEV_MAPKIT_TOKEN || '';
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [initialCoordinates, setInitialCoordinates] = useState<{ latitude: number, longitude: number } | null>(null);

  useEffect(() => {
    const fetchInitialCoordinates = async () => {
      const coordinates = await fetchCoordinates(slug);
      setInitialCoordinates(coordinates);
    };
    fetchInitialCoordinates();
  }, [slug]);

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelectLocation(selectedLocation);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle className='text-white'>Stadtmitte auswählen</DialogTitle>
        <div className='w-full h-96'>
            <Map 
            colorScheme={ColorScheme.Dark} 
            mapType={MapType.Standard} 
            token={token} 
            initialRegion={initialCoordinates ? { centerLatitude: initialCoordinates.latitude, centerLongitude: initialCoordinates.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 } : undefined} 
            onLongPress={(event) => {
              const coordinates = event.toCoordinates();
              setSelectedLocation({ latitude: coordinates.latitude, longitude: coordinates.longitude });
            }}
            showsPointsOfInterest={true}
            showsCompass={FeatureVisibility.Hidden}
            showsScale={FeatureVisibility.Hidden}
            >
            {selectedLocation && <Marker color='#0FA7AF' latitude={selectedLocation.latitude} longitude={selectedLocation.longitude} />}
            </Map>
        </div>
        <DialogFooter className='mt-4'>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant='secondary' onClick={handleConfirm} disabled={!selectedLocation}>Bestätigen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ModuleDialog = ({ isOpen, onClose, productId, refreshModules }: { isOpen: boolean, onClose: () => void, productId: string, refreshModules: () => void }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('Filialfinder');
    const [description, setDescription] = useState('');
    const [settings, setSettings] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
    const [center, setCenter] = useState<{ latitude: number, longitude: number } | null>(null);
    const [slug, setSlug] = useState('');

    useEffect(() => {
      const fetchProductName = async () => {
        const productDoc = await getDoc(doc(db, 'product', productId));
        if (productDoc.exists()) {
          setSlug(productDoc.data().slug);
        }
      };
      fetchProductName();
    }, [productId]);
  
    const handleSave = async () => {
      setLoading(true);
      try {
        const id = getRandomId();
        await setDoc(doc(db, `product/${productId}/modules`, id), {
          name,
          type,
          description,
          settings,
          created: new Date(),
          center,
        });
  
        setName('');
        setType('Filialfinder');
        setDescription('');
        setSettings('');
        onClose();
        refreshModules();
      } catch (error) {
        console.error('Error adding module: ', error);
      } finally {
        setLoading(false);
      }
    };
  
    if (loading) {
      return (
        <div className='absolute h-screen w-screen flex items-center justify-center bg-black top-0 left-0'>
          <Progress value={100} className='w-1/3' />
        </div>
      );
    }

    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent>
            <DialogTitle className='text-white'>Modul hinzufügen</DialogTitle>
            <DialogDescription className='text-neutral-300'>
              Bitte geben Sie die folgenden Informationen ein:
            </DialogDescription>
            <Input
              type='text'
              placeholder='Name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full text-white placeholder:text-neutral-400'
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className='w-full text-white placeholder:text-neutral-400 mt-4'>
                <SelectValue placeholder="Modul Art" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value='Filialfinder'>Filialfinder</SelectItem>
                  <SelectItem value='Kartenmodul'>Kartenmodul</SelectItem>
                  <SelectItem value='PDF-Modul'>PDF-Modul</SelectItem>
                  <SelectItem value='Offnungszeiten'>Öffnungszeiten</SelectItem>
                  <SelectItem value='Formular-Modul'>Formular Modul</SelectItem>
                  <SelectItem value='Kontakt-Modul'>Kontakt Modul</SelectItem>
                  <SelectItem value='Terminal-Modul'>Terminal Modul</SelectItem>
                </SelectContent>
            </Select>
            {type === 'Kartenmodul' && (
              <Button className='w-full mt-4' onClick={() => setIsMapDialogOpen(true)}>
                {center ? 'Stadtmitte ändern' : 'Stadtmitte auswählen'}
              </Button>
            )}
            {type === 'PDF-Modul' ? (
                <Textarea className='w-full text-white placeholder:text-neutral-400 mt-4' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Beschreibung'/>
              ) : (
                <Input className='w-full text-white placeholder:text-neutral-400 mt-4' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Beschreibung'/>
            )}
            <Input
              type='text'
              placeholder='Farbe (#000000)'
              value={settings}
              onChange={(e) => setSettings(e.target.value)}
              className='w-full text-white placeholder:text-neutral-400 mt-4'
            />
            <DialogFooter className='mt-8'>
              <Button onClick={onClose}>Abbrechen</Button>
              <Button variant='secondary' onClick={handleSave}>Hinzufügen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <MapDialog isOpen={isMapDialogOpen} onClose={() => setIsMapDialogOpen(false)} onSelectLocation={setCenter} slug={slug} />
      </>
    );
};

export const EditProductDialog = ({ isOpen, onClose, product, refreshProduct }: { isOpen: boolean, onClose: () => void, product: { id: string, name: string }, refreshProduct: () => void }) => {
  const [name, setName] = useState(product.name);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'product', product.id), { name });
      refreshProduct();
      onClose();
    } catch (error) {
      console.error('Error updating product: ', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeleteLoading(true);
    try {
      await handleDelete(productId);
      router.push('/dashboard/');
    } catch (error) {
      console.error('Error deleting product: ', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle className='text-white'>Produkt bearbeiten</DialogTitle>
        <DialogDescription className='text-neutral-300'>
          Passen Sie den Produktnamen an oder löschen Sie das Produkt.
        </DialogDescription>
        <Input
          type='text'
          placeholder='Name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='w-full text-white placeholder:text-neutral-400'
        />
        <DialogFooter className='flex w-full mt-4'>
          {confirmDelete ? (
            <Button variant='destructive' onClick={() => handleDeleteProduct(product.id)} disabled={deleteLoading}>
              {deleteLoading ? 'Löschen...' : 'Löschen'}
            </Button>
          ) : (
            <Button variant='destructive' onClick={() => setConfirmDelete(true)}>
              Löschen
            </Button>
          )}
          <div className='flex flex-1 justify-end gap-4'>
            <Button onClick={onClose}>Abbrechen</Button>
            <Button variant='secondary' onClick={handleSave} disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ProductModules = ({ productId }: { productId: string }) => {
  const [product, setProduct] = useState<{ name: string; slug: string; created: string } | null>(null);
  const [modules, setModules] = useState<{ id: string; name: string; type: string; description: string; settings: string }[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (!user) {
            router.push('/');
          }
        });
    
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        const fetchProductAndModules = async () => {
        try {
            const productDoc = await getDoc(doc(db, 'product', productId));
            if (productDoc.exists()) {
            setProduct(productDoc.data() as { name: string; slug: string; created: string });
            } else {
            console.error('Product not found');
            }

            const querySnapshot = await getDocs(collection(db, `product/${productId}/modules`));
            const modulesList = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, name: data.name, type: data.type, description: data.description, settings: data.settings };
            });
            setModules(modulesList);
        } catch (error) {
            console.error('Error fetching product and modules: ', error);
        } finally {
            setLoading(false);
        }
        };

        fetchProductAndModules();
    }, [productId]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 10 : 100));
      }, 110);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const refreshModules = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, `product/${productId}/modules`));
      const modulesList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, name: data.name, type: data.type, description: data.description, settings: data.settings };
      });
      setModules(modulesList);
    } catch (error) {
      console.error('Error fetching modules: ', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProduct = async () => {
    try {
      const productDoc = await getDoc(doc(db, 'product', productId));
      if (productDoc.exists()) {
        setProduct(productDoc.data() as { name: string; slug: string; created: string });
      } else {
        console.error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product: ', error);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'product'));
        const productsList = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            return { id: doc.id, name: data.name, allowedUsers: data.allowedUsers || [] };
          })
          .filter(product => product.allowedUsers.includes(auth.currentUser?.uid)); // Filter by user access
        setProducts(productsList);
      } catch (error) {
        console.error('Error fetching products: ', error);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className='absolute h-screen w-screen flex items-center justify-center bg-background top-0 left-0'>
        <Progress value={progress} className='w-1/3' />
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'Filialfinder':
        return <FaOutdent />;
      case 'Kartenmodul':
        return <FaMapLocationDot />;
      case 'PDF-Modul':
        return <FaFilePdf />;
      case 'Offnungszeiten':
        return <FaClock />;
      case 'Formular-Modul':
        return <FaClipboardList />;
      case 'Terminal-Modul':
        return <FaTablet />;
      case 'Kontakt-Modul':
        return <FaPhone />;
      default:
        return null;
    }
  };

  return (
    <div className='bg-background min-h-screen w-screen flex justify-center'>
      <div className='max-w-[1900px] w-full p-4 md:p-12'>
        {product && (
          <>
            <div className='mb-8 w-full flex justify-between items-center'>
                <div className='flex gap-2'>
                    <Button onClick={() => router.push(`/dashboard/`)}>
                      <FaChevronLeft />
                    </Button>
                    <NavigationMenu>
                      <NavigationMenuList>
                        <NavigationMenuItem>
                          <NavigationMenuTrigger className='text-base font-medium'>{product.name}</NavigationMenuTrigger>
                          <NavigationMenuContent className='divide-y divide-white/10'>
                              <NavigationMenuLink className='flex flex-row min-w-44 w-fit hover:bg-primary bg-card-foreground border-border text-white text-sm py-2 px-3 cursor-pointer' onClick={() => router.push(`/dashboard/`)}>
                                Home
                              </NavigationMenuLink>
                            {products.map((prod) => (
                              <NavigationMenuLink className='flex flex-row min-w-44 w-fit hover:bg-primary bg-card-foreground border-border text-white text-sm py-2 px-3 cursor-pointer' key={prod.id} onClick={() => router.push(`/dashboard/${prod.id}`)}>
                                {prod.name}
                              </NavigationMenuLink>
                            ))}
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      </NavigationMenuList>
                    </NavigationMenu>
                </div>

                <div className='flex gap-2'>
                    <Button onClick={() => setIsEditDialogOpen(true)}><FaGear/></Button>
                    <Button variant='secondary' onClick={() => setIsDialogOpen(true)}>Create Module</Button>
                </div>
            </div>
          </>
        )}
        <EditProductDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} product={{ id: productId, name: product?.name || '' }} refreshProduct={refreshProduct} />
        <ModuleDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} productId={productId} refreshModules={refreshModules} />
        {modules.length === 0 ? (
          <div className='text-white text-center mt-8 h-full w-full flex items-center justify-center flex-col gap-2'><FaCloudBolt className='h-10 w-10'/> No modules found</div>
        ) : (
          <div className='w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-10'>
            {modules.map((module) => (
              <div key={module.id} className='bg-gray-500/15 p-4 rounded-lg flex flex-col text-center items-center cursor-pointer' onClick={() => router.push(`/dashboard/${productId}/modules/${module.id}`)}>
                <div className='text-2xl rounded-full mb-2 p-5 bg-gray-500/20' style={{color: module.settings}}>{getIcon(module.type)}</div>
                <div className='text-white text-lg'>{module.name}</div>
                <div className='text-neutral-400'>{module.type}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
