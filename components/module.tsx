'use client'
import { auth, firebaseConfig } from '@/database';
import { getApps, initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import React, { useState, useEffect, JSX } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { FaOutdent, FaMapLocationDot, FaFilePdf, FaClock, FaClipboardList, FaGear, FaChevronLeft, FaTablet, FaPhone, FaPeopleGroup, FaGripVertical, FaCopy } from "react-icons/fa6";
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Textarea } from './ui/textarea';
import { SelectValue } from '@radix-ui/react-select';
import { Map, Marker, MapType, ColorScheme, FeatureVisibility } from 'mapkit-react';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import getRandomId from '@/utils/getRandomId';
import handleDelete from '@/utils/dataHandler';
import { RiListSettingsLine, RiDeleteBinLine, RiEdit2Line } from "react-icons/ri";
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCurrentTheme } from './theme-provider';
import { getAuth } from 'firebase/auth'

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
        <DialogTitle className='text-foreground'>Stadtmitte auswählen</DialogTitle>
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
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUserEmail(user.email);
        } else {
          setUserEmail(null);
        }
      });
    
      return () => unsubscribe();
    }, []);

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
            <DialogTitle className='text-foreground'>Modul hinzufügen</DialogTitle>
            <DialogDescription className='text-foreground/60'>
              Bitte geben Sie die folgenden Informationen ein:
            </DialogDescription>
            <Input
              type='text'
              placeholder='Name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full text-foreground placeholder:text-neutral-400'
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className='w-full text-foreground placeholder:text-neutral-400 mt-4'>
                <SelectValue placeholder="Modul Art" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value='Filialfinder'>Filialfinder</SelectItem>
                  <SelectItem value='Kartenmodul'>Kartenmodul</SelectItem>
                  <SelectItem value='PDF-Modul'>PDF-Modul</SelectItem>
                  <SelectItem value='Offnungszeiten'>Öffnungszeiten</SelectItem>
                  <SelectItem value='Formular-Modul'>Formular Modul</SelectItem>
                  <SelectItem value='Kontakt-Modul'>Kontakt Modul</SelectItem>
                  <SelectItem value='Link-Modul'>Link Modul</SelectItem>
                  {(userEmail?.endsWith('@cosmema.de') || userEmail?.endsWith('@heimat-info.de')) && (
                    <>
                      <SelectItem value='Beteiligungs-Modul'>Beteiligungs Modul</SelectItem>
                      <SelectItem value='Terminal-Modul'>Terminal Modul</SelectItem>
                    </>
                  )}
                </SelectContent>
            </Select>
            {type === 'Kartenmodul' && (
              <Button className='w-full mt-4' onClick={() => setIsMapDialogOpen(true)}>
                {center ? 'Stadtmitte ändern' : 'Stadtmitte auswählen'}
              </Button>
            )}
            {type === 'PDF-Modul' ? (
                <Textarea className='w-full text-foreground placeholder:text-neutral-400 mt-4' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Beschreibung'/>
              ) : (
                <Input className='w-full text-foreground placeholder:text-neutral-400 mt-4' value={description} onChange={(e) => setDescription(e.target.value)} placeholder='Beschreibung'/>
            )}
            <Input
              type='text'
              placeholder='Farbe (#000000)'
              value={settings}
              onChange={(e) => setSettings(e.target.value)}
              className='w-full text-foreground placeholder:text-neutral-400 mt-4'
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
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle className='text-foreground'>Produkt bearbeiten</DialogTitle>
          <DialogDescription className='text-foreground/60'>
            Passen Sie den Produktnamen an oder löschen Sie das Produkt.
          </DialogDescription>
          <Input
            type='text'
            placeholder='Name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='w-full text-foreground placeholder:text-neutral-400'
          />
          <DialogFooter className='flex w-full mt-4'>
            <Button variant='destructive' onClick={() => setIsDeleteConfirmationOpen(true)}>
              Löschen
            </Button>
            <div className='flex flex-1 justify-end gap-4'>
              <Button onClick={onClose}>Abbrechen</Button>
              <Button variant='secondary' onClick={handleSave} disabled={loading}>
                {loading ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
        <DialogContent>
          <DialogTitle className='text-foreground'>Löschen bestätigen</DialogTitle>
          <DialogDescription className='text-neutral-300'>
            Sind Sie sicher, dass Sie dieses Produkt löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => setIsDeleteConfirmationOpen(false)}>Abbrechen</Button>
            <Button variant='destructive' onClick={() => handleDeleteProduct(product.id)} disabled={deleteLoading}>
              {deleteLoading ? 'Löschen...' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SortableCategory = ({ id, children }: { id: string, children: (listeners: any) => JSX.Element }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
};

export const ProductModules = ({ productId }: { productId: string }) => {
  const [product, setProduct] = useState<{ name: string; slug: string; created: string } | null>(null);
  const [modules, setModules] = useState<{ id: string; name: string; type: string; description: string; settings: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; modules: string[], sort: number }[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useCurrentTheme();
  const [allowCreateModuleBtn, setAllowCreateModuleBtn] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const productDoc = await getDoc(doc(db, 'product', productId));
        if (productDoc.exists()) {
          setProduct(productDoc.data() as { name: string; slug: string; created: string });
        } else {
          console.error('Product not found');
        }

        const modulesSnapshot = await getDocs(collection(db, `product/${productId}/modules`));
        const modulesList = modulesSnapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, name: data.name, type: data.type, description: data.description, settings: data.settings };
        });
        setModules(modulesList);

        const categoriesSnapshot = await getDocs(collection(db, `product/${productId}/categories`));
        if (!categoriesSnapshot.empty) {
          const categoriesList = categoriesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, name: data.name, modules: data.modules || [], sort: data.sort || 0 };
          });
          setCategories(categoriesList);
        }
      } catch (error) {
        console.error('Error fetching product data: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
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
          .filter(product => product.allowedUsers.includes(auth.currentUser?.uid));
        setProducts(productsList);
      } catch (error) {
        console.error('Error fetching products: ', error);
      }
    };

    fetchProducts();
  }, []);

  // lade Recht zum Modul-Erstellen
  useEffect(() => {
    const fetchPerm = async () => {
      const user = getAuth().currentUser
      if (!user) return
      const infoRef = doc(db, 'global/users', user.uid, 'info')
      const snap = await getDoc(infoRef)
      setAllowCreateModuleBtn(!!snap.exists() && !!snap.data()?.allowCreateModule)
    }
    fetchPerm()
  }, [])

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = categories.findIndex((category) => category.id === active.id);
      const newIndex = categories.findIndex((category) => category.id === over.id);
      const newCategories = arrayMove(categories, oldIndex, newIndex).map((category, index) => ({
        ...category,
        sort: index,
      }));
      setCategories(newCategories);

      try {
        const batch = writeBatch(db);
        newCategories.forEach((category) => {
          const categoryRef = doc(db, `product/${productId}/categories`, category.id);
          batch.update(categoryRef, { sort: category.sort });
        });
        await batch.commit();
      } catch (error) {
        console.error("Error updating category sort order in Firestore:", error);
      }
    }
  };

  const handleAddCategory = async () => {
    setEditingCategoryId(null);
    setNewCategoryName('');

    const id = getRandomId();
    try {
      const newCategory = {
        name: newCategoryName,
        modules: [],
        sort: categories.length,
      };
      await setDoc(doc(db, `product/${productId}/categories`, id), newCategory);
      setCategories((prev) => [...prev, { id, ...newCategory }]);
      setNewCategoryName('');
      setIsAddCategoryDialogOpen(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteDoc(doc(db, `product/${productId}/categories`, categoryId));
      const updatedCategories = categories
        .filter((category) => category.id !== categoryId)
        .map((category, index) => ({
          ...category,
          sort: index,
        }));
      setCategories(updatedCategories);

      const batch = writeBatch(db);
      updatedCategories.forEach((category) => {
        const categoryRef = doc(db, `product/${productId}/categories`, category.id);
        batch.update(categoryRef, { sort: category.sort });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleRenameCategory = async (categoryId: string, newName: string) => {
    try {
      await updateDoc(doc(db, `product/${productId}/categories`, categoryId), { name: newName });
      setEditingCategoryId(null);
      refreshCategories();
    } catch (error) {
      console.error('Error renaming category:', error);
    }
  };

  const refreshCategories = async () => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, `product/${productId}/categories`));
      const categoriesList = categoriesSnapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, name: data.name, modules: data.modules || [], sort: data.sort || 0 };
      });
      setCategories(categoriesList.sort((a, b) => a.sort - b.sort)); // Ensure categories are sorted by their sort value
    } catch (error) {
      console.error('Error refreshing categories:', error);
    }
  };

  const handleMoveModule = async (moduleId: string, oldCategoryId: string | null, newCategoryId: string | null) => {
    try {
      if (oldCategoryId) {
        const oldCategoryRef = doc(db, `product/${productId}/categories`, oldCategoryId);
        const oldCategoryDoc = await getDoc(oldCategoryRef);
        if (oldCategoryDoc.exists()) {
          const oldModules = oldCategoryDoc.data().modules || [];
          await updateDoc(oldCategoryRef, {
            modules: oldModules.filter((id: string) => id !== moduleId),
          });
        }
      }
  
      if (newCategoryId) {
        const newCategoryRef = doc(db, `product/${productId}/categories`, newCategoryId);
        const newCategoryDoc = await getDoc(newCategoryRef);
        if (newCategoryDoc.exists()) {
          const newModules = newCategoryDoc.data().modules || [];
          await updateDoc(newCategoryRef, {
            modules: [...newModules, moduleId],
          });
        }
      }
  
      refreshCategories();
    } catch (error) {
      console.error('Error moving module: ', error);
    }
  };

  const filteredModules = modules.filter((module) =>
    module.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.map((category) => ({
    ...category,
    modules: category.modules.filter((moduleId) =>
      modules.find((mod) => mod.id === moduleId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }));

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
      case 'Beteiligungs-Modul':
        return <FaPeopleGroup />;
      case 'Kontakt-Modul':
        return <FaPhone />;
      case 'Link-Modul':
        return <FaCopy />;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen w-screen flex justify-center ${theme === "modern" ? "bg-gradient-to-br from-blue-950/50 via-purple-900/25 to-blue-900/35" : "bg-background"}`}>
      <div className='max-w-[1900px] w-full p-4 md:p-12'>
        {product && (
          <>
            <div className='mb-8 w-full flex gap-8 justify-between items-center'>
                <div className='flex gap-2'>
                    <Button onClick={() => router.push(`/dashboard/`)}>
                      <FaChevronLeft />
                    </Button>
                    <NavigationMenu>
                      <NavigationMenuList>
                        <NavigationMenuItem>
                          <NavigationMenuTrigger className='text-base font-medium'>{product.name}</NavigationMenuTrigger>
                          <NavigationMenuContent className='divide-y divide-white/10'>
                              <NavigationMenuLink className='flex flex-row min-w-44 w-fit hover:bg-primary bg-card-foreground border-border text-foreground text-sm py-2 px-3 cursor-pointer' onClick={() => router.push(`/dashboard/`)}>
                                Home
                              </NavigationMenuLink>
                            {products.map((prod) => (
                              <NavigationMenuLink className='flex flex-row min-w-44 w-fit hover:bg-primary bg-card-foreground border-border text-foreground text-sm py-2 px-3 cursor-pointer' key={prod.id} onClick={() => router.push(`/dashboard/${prod.id}`)}>
                                {prod.name}
                              </NavigationMenuLink>
                            ))}
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      </NavigationMenuList>
                    </NavigationMenu>
                </div>

                <div className='w-full'>
                  <Input
                    placeholder='Suchen...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full bg-background/60 backdrop-blur-xl'
                  />
                </div>

                <div className='flex gap-2'>
                    <Button onClick={() => setIsEditDialogOpen(true)}><FaGear/></Button>
                    <Button
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={isEditMode ? 'border border-secondary' : ''}
                    >
                      <RiListSettingsLine />
                    </Button>
                    {allowCreateModuleBtn && (
                      <Button variant='secondary' onClick={() => setIsDialogOpen(true)}>
                        Modul erstellen
                      </Button>
                    )}
                </div>
            </div>
          </>
        )}
        {isEditMode && (
          <div className='mb-4 w-full py-3 bg-primary/50 flex justify-between items-center rounded-md px-4'>
            <p><b>Bearbeitungsmodus:</b> Kategorien und Modulzuweisungen verwalten</p>
            <Button
              variant='secondary'
              onClick={() => {
                setEditingCategoryId(null);
                setIsAddCategoryDialogOpen(true);
              }}
            >
              Kategorie hinzufügen
            </Button>
          </div>
        )}
        <EditProductDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} product={{ id: productId, name: product?.name || '' }} refreshProduct={refreshProduct} />
        <ModuleDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} productId={productId} refreshModules={refreshModules} />
        {filteredCategories.length > 0 ? (
          <>
            {isEditMode && (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
                  {categories
                    .sort((a, b) => a.sort - b.sort)
                    .map((category) => (
                      <SortableCategory key={category.id} id={category.id}>
                        {(listeners: any) => (
                          <div className='mb-8'>
                            <div className='text-foreground flex items-center gap-4 text-xl font-semibold mb-4'>
                              <span className='cursor-grab' {...listeners}>
                                <FaGripVertical />
                              </span>
                              {editingCategoryId === category.id ? (
                                <input
                                  type='text'
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  onBlur={() => handleRenameCategory(category.id, newCategoryName)}
                                  className='border bg-transparent text-foreground p-2 rounded'
                                />
                              ) : (
                                <span
                                  className='min-w-fit cursor-pointer'
                                  onDoubleClick={() => setEditingCategoryId(category.id)}
                                >
                                  {category.name}
                                </span>
                              )}
                              <div className='w-full h-[1px] bg-border' />
                              <Button onClick={() => setEditingCategoryId(category.id)}>
                                <RiEdit2Line />
                              </Button>
                              <Button variant='destructive' onClick={() => handleDeleteCategory(category.id)}>
                                <RiDeleteBinLine />
                              </Button>
                            </div>
                            <div className='w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                              {category.modules.map((moduleId) => {
                                const module = modules.find((mod) => mod.id === moduleId);
                                return module ? (
                                  <div
                                    key={module.id}
                                    className={`bg-gray-500/15 p-4 rounded-lg flex flex-col text-center items-center relative ${!isEditMode ? 'cursor-pointer' : ''}`}
                                    onClick={() => !isEditMode && router.push(`/dashboard/${productId}/modules/${module.id}`)}
                                  >
                                    <div className='text-2xl rounded-full mb-2 p-5 bg-gray-500/20' style={{ color: module.settings }}>{getIcon(module.type)}</div>
                                    <div className='text-foreground text-lg'>{module.name}</div>
                                    <div className='text-neutral-400'>{module.type}</div>
                                    {isEditMode && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button className='border mt-3'>Verschieben</Button>
                                        </PopoverTrigger>
                                        <PopoverContent>
                                          <div className='flex flex-col gap-2'>
                                            {categories
                                              .filter((cat) => cat.id !== category.id)
                                              .map((cat) => (
                                                <Button
                                                  key={cat.id}
                                                  onClick={() => handleMoveModule(module.id, category.id, cat.id)}
                                                >
                                                  {cat.name}
                                                </Button>
                                              ))}
                                            <Button
                                              onClick={() => handleMoveModule(module.id, category.id, null)}
                                            >
                                              Unkategorisiert
                                            </Button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </SortableCategory>
                    ))}
                </SortableContext>
              </DndContext>
            )}
            {!isEditMode && (
              <>
                {filteredCategories.map((category) => (
                  <div key={category.id} className='mb-8'>
                    <div className='text-foreground flex items-center gap-4 text-xl font-semibold mb-4'>
                      {editingCategoryId === category.id ? (
                        <input
                          type='text'
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          onBlur={() => handleRenameCategory(category.id, newCategoryName)}
                          className='border bg-transparent text-foreground p-2 rounded'
                        />
                      ) : (
                        <span className='min-w-fit'>{category.name}</span>
                      )}
                      <div className='w-full h-[1px] bg-border' />
                      {isEditMode && (
                        <>
                          <Button onClick={() => setEditingCategoryId(category.id)}>
                            <RiEdit2Line />
                          </Button>
                          <Button variant='destructive' onClick={() => handleDeleteCategory(category.id)}>
                            <RiDeleteBinLine />
                          </Button>
                        </>
                      )}
                    </div>
                    <div className='w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                      {category.modules.length > 0 || isEditMode ? (
                        category.modules.map((moduleId) => {
                          const module = modules.find((mod) => mod.id === moduleId);
                          return module ? (
                            <div
                              key={module.id}
                              className={`bg-gray-500/15 p-4 rounded-lg flex flex-col text-center items-center relative ${!isEditMode ? 'cursor-pointer' : ''}`}
                              onClick={() => !isEditMode && router.push(`/dashboard/${productId}/modules/${module.id}`)}
                            >
                              <div className='text-2xl rounded-full mb-2 p-5 bg-gray-500/20' style={{ color: module.settings }}>{getIcon(module.type)}</div>
                              <div className='text-foreground text-lg'>{module.name}</div>
                              <div className='text-neutral-400'>{module.type}</div>
                              {isEditMode && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button className='border mt-3'>Verschieben</Button>
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <div className='flex flex-col gap-2'>
                                      {categories
                                        .filter((cat) => cat.id !== category.id)
                                        .map((cat) => (
                                          <Button
                                            key={cat.id}
                                            onClick={() => handleMoveModule(module.id, category.id, cat.id)}
                                          >
                                            {cat.name}
                                          </Button>
                                        ))}
                                      <Button
                                        onClick={() => handleMoveModule(module.id, category.id, null)}
                                      >
                                        Unkategorisiert
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          ) : null;
                        })
                      ) : (
                        isEditMode && <div className='text-neutral-400'>Keine Module</div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            <div className='w-full h-[1px] bg-border' />
          </>
        ) : null}
        <div className='w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-10'>
          {filteredModules
            .filter((module) => !categories.some((category) => category.modules.includes(module.id)))
            .map((module) => (
              <div
                key={module.id}
                className={`p-4 rounded-lg flex flex-col text-center items-center relative ${theme === "modern" ? "bg-violet-500/10 border border-white/5" : "bg-gray-500/15" } ${!isEditMode ? 'cursor-pointer' : ''}`}
                onClick={() => !isEditMode && router.push(`/dashboard/${productId}/modules/${module.id}`)}
              >
                <div className={`text-2xl rounded-full mb-2 p-5 ${theme === "modern" ? "bg-white/5 border border-white/5" : "bg-gray-500/20" }`} style={{ color: module.settings }}>{getIcon(module.type)}</div>
                <div className='text-foreground text-lg'>{module.name}</div>
                <div className='text-neutral-400'>{module.type}</div>
                {isEditMode && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button className='border mt-4'>Verschieben</Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className='flex flex-col gap-2'>
                        {categories.map((cat) => (
                          <Button
                            key={cat.id}
                            onClick={() => handleMoveModule(module.id, null, cat.id)}
                          >
                            {cat.name}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            ))}
        </div>
        {isAddCategoryDialogOpen && (
          <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
            <DialogContent>
              <DialogTitle>Kategorie hinzufügen</DialogTitle>
              <Input
                type='text'
                placeholder='Kategoriename'
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className='w-full mt-4'
              />
              <DialogFooter>
                <Button onClick={() => setIsAddCategoryDialogOpen(false)}>Abbrechen</Button>
                <Button variant='secondary' onClick={handleAddCategory}>
                  Hinzufügen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};