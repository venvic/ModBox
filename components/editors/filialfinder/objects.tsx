'use client'

import React, { useEffect, useState, JSX } from 'react';
import { Button } from '@/components/ui/button'; 
import { FaGrip, FaPlus, FaTrash } from 'react-icons/fa6';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import * as FaIcons from 'react-icons/fa6';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import AddressSelector from '@/components/addressSelector';
import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import getRandomId from '@/utils/getRandomId';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { CSS } from '@dnd-kit/utilities';

const db = getFirestore();
const storage = getStorage();

const LAST_USED_ICONS_KEY = 'lastUsedIcons';

const getLastUsedIcons = () => {
  const icons = localStorage.getItem(LAST_USED_ICONS_KEY);
  return icons ? JSON.parse(icons) : [];
};

const saveLastUsedIcon = (iconName: string) => {
  let icons = getLastUsedIcons();
  icons = [iconName, ...icons.filter((icon: string) => icon !== iconName)];
  if (icons.length > 10) {
    icons.pop();
  }
  localStorage.setItem(LAST_USED_ICONS_KEY, JSON.stringify(icons));
};

const SortableItem = ({ id, children }: { id: string, children: (listeners: any) => JSX.Element }) => {
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

const ObjectsEditor = ({ moduleId, productId, categories, onChangesSaved, filteredObjects }: { moduleId: string, productId: string, categories: any[], onChangesSaved: () => void, filteredObjects: (objects: any[]) => any[] }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('');
    const [fields, setFields] = useState<any[]>([{ name: '', value: '', icon: '', address: false, link: false, gremium: false, list: false, coordinates: { latitude: 0, longitude: 0 } }]);
    const [iconSearch, setIconSearch] = useState('');
    const [objects, setObjects] = useState<any[]>([]);
    const [deletedObjects, setDeletedObjects] = useState<{ id: string, categoryId: string }[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [description, setDescription] = useState('');
    const [imageInsight, setImageInsight] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  
    const fetchObjects = async () => {
      const objectsList: any[] = [];
      for (const category of categories) {
        const objectsSnapshot = await getDocs(collection(db, `product/${productId}/modules/${moduleId}/categories/${category.id}/objects`));
        const categoryObjects = objectsSnapshot.docs.map(doc => ({ id: doc.id, category: category.id, sort: 0, ...doc.data() }));
        objectsList.push(...categoryObjects);
      }
      objectsList.sort((a, b) => a.sort - b.sort);
      setObjects(objectsList);
    };
  
    useEffect(() => {
      fetchObjects();
    }, [moduleId, productId, categories]);
  
  
    const handleAddField = () => {
      setFields([...fields, { name: '', value: '', icon: '', address: false, link: false, gremium: false }]);
    };
  
    const handleFieldChange = (index: number, field: string, value: any) => {
      const updatedFields = [...fields];
      if (field === 'value' && fields[index].list) {
        value = value.split('\n').map((line: string) => line.startsWith('# ') ? line : `# ${line}`).join('\n');
      }
      updatedFields[index][field] = value;
      if (field === 'gremium' && value) {
        updatedFields[index]['link'] = false;
        updatedFields[index]['list'] = false;
        updatedFields[index]['address'] = false;
      }
      else if (field === 'link' && value) {
        updatedFields[index]['gremium'] = false;
        updatedFields[index]['list'] = false;
        updatedFields[index]['address'] = false;
      }
      else if (field == 'list' && value) {
        updatedFields[index]['gremium'] = false;
        updatedFields[index]['link'] = false;
        updatedFields[index]['address'] = false;
      }
      else if (field == 'address' && value) {
        updatedFields[index]['gremium'] = false;
        updatedFields[index]['list'] = false;
        updatedFields[index]['link'] = false;
      }
      setFields(updatedFields);
    };
  
    const handleAddressSelect = (index: number, address: string, coordinates: { latitude: number, longitude: number }) => {
      const updatedFields = [...fields];
      updatedFields[index].coordinates = coordinates;
      setFields(updatedFields);
    };
  
    const handleRemoveField = (index: number) => {
      const updatedFields = fields.filter((_, i) => i !== index);
      setFields(updatedFields);
    };
  
    const handleImageUpload = async (file: File, objectId: string) => {
      const storageRef = ref(storage, `IMAGES/${moduleId}/${objectId}/${file.name}`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    };
  
    const handleSaveProduct = async () => {
      if (!productName || !category) {
        toast.error("Fehler", { description: "Produktname und Kategorie sind erforderlich" });
        return;
      }
    
      const objectId = editingObjectId || getRandomId(undefined, 5);
      let imageUrlToSave = imageUrl;
    
      if (selectedImageFile) {
        imageUrlToSave = await handleImageUpload(selectedImageFile, objectId);
      }
    
      const newProduct = {
        name: productName,
        category,
        fields: fields.map(field => ({
          ...field,
          value: field.list ? field.value.split('\n').map((line: string) => line.startsWith('# ') ? line : `# ${line}`).join('\n') : field.value,
          gremium: field.gremium || false,
          list: field.list || false,
          coordinates: field.address ? field.coordinates : { latitude: 0, longitude: 0 },
        })),
        sort: editingObjectId ? objects.find(obj => obj.id === editingObjectId)?.sort : objects.filter(obj => obj.category === category).length + 1,
        imageUrl: imageUrlToSave || '.',
        description: description || '.',
        imageInsight,
      };
    
      const batch = writeBatch(db);
      if (editingObjectId) {
        // Update existing object
        const existingObject = objects.find(obj => obj.id === editingObjectId);
        if (existingObject && existingObject.category !== category) {
          // Delete old object if category has changed
          const oldObjectRef = doc(db, `product/${productId}/modules/${moduleId}/categories/${existingObject.category}/objects`, editingObjectId);
          batch.delete(oldObjectRef);
        }
        const productRef = doc(db, `product/${productId}/modules/${moduleId}/categories/${category}/objects`, editingObjectId);
        batch.set(productRef, newProduct);
      } else {
        // Create new object
        const productRef = doc(db, `product/${productId}/modules/${moduleId}/categories/${category}/objects`, objectId);
        batch.set(productRef, newProduct);
      }
    
      await batch.commit();
    
      setIsDialogOpen(false);
      setStep(1);
      setProductName('');
      setCategory('');
      setFields([{ name: '', value: '', icon: '', address: false, link: false, gremium: false, list: false }]);
      setEditingObjectId(null);
      setSelectedImageFile(null);
      toast.success("Produkt gespeichert", { description: `${new Date().toLocaleTimeString()}` });
      fetchObjects(); // Refetch objects after saving
      onChangesSaved(); // Call onChangesSaved after saving
    };
  
    const handleRemoveSelectedImage = () => {
      setSelectedImageFile(null);
      setImageUrl('');
    };
  
    const handleEditObject = (obj: any) => {
      setProductName(obj.name);
      setCategory(obj.category);
      setFields(obj.fields);
      setImageUrl(obj.imageUrl || '');
      setDescription(obj.description || '');
      setImageInsight(obj.imageInsight || false);
      setIsDialogOpen(true);
      setStep(1);
      setEditingObjectId(obj.id);
      setSelectedImageFile(null);
    };
  
    const handleRemoveObject = (id: string, categoryId: string) => {
      const updatedObjects = objects.map(obj => 
        obj.id === id ? { ...obj, isDeleted: true } : obj
      );
      setObjects(updatedObjects);
      setDeletedObjects([...deletedObjects, { id, categoryId }]);
      setHasChanges(true);
    };
  
    const handleDragEnd = (event: any) => {
      const { active, over } = event;
      if (active.id !== over.id) {
        const activeObject = objects.find(obj => obj.id === active.id);
        const overObject = objects.find(obj => obj.id === over.id);
        if (activeObject?.category === overObject?.category) {
          const oldIndex = objects.findIndex(obj => obj.id === active.id);
          const newIndex = objects.findIndex(obj => obj.id === over.id);
          const newObjects = arrayMove(objects, oldIndex, newIndex).map((obj, index) => ({
            ...obj,
            sort: obj.category === activeObject.category ? index + 1 : obj.sort,
          }));
          setObjects(newObjects);
          setHasChanges(true);
        }
      }
    };
  
    const handleSaveChanges = async () => {
      const batch = writeBatch(db);
      deletedObjects.forEach(({ id, categoryId }) => {
        const objRef = doc(db, `product/${productId}/modules/${moduleId}/categories/${categoryId}/objects`, id);
        batch.delete(objRef);
      });
      objects.forEach((obj) => {
        if (!obj.isDeleted) {
          const objRef = doc(db, `product/${productId}/modules/${moduleId}/categories/${obj.category}/objects`, obj.id);
          batch.set(objRef, obj);
        }
      });
      await batch.commit();
      setDeletedObjects([]);
      setHasChanges(false);
      toast.success("Änderungen gespeichert", { description: `${new Date().toLocaleTimeString()}` });
      fetchObjects();
      onChangesSaved();
    };
  
    const filteredIcons = Object.keys(FaIcons).filter(iconName => iconName.toLowerCase().includes(iconSearch.toLowerCase()));
    const lastUsedIcons = getLastUsedIcons();
  
    return (
      <>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className='ml-2' onClick={() => { setStep(1); setProductName(''); setDescription(''); setImageUrl(''); setFields([{ name: '', value: '', icon: '', address: false, link: false, gremium: false }]); }}>
                Produkt hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{step === 1 ? 'Produktinformationen' : 'Felder hinzufügen'}</DialogTitle>
            </DialogHeader>
            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Produktname"
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => category && productName ? setStep(2) : toast.error("Fehler", { description: "Produktname und Kategorie sind erforderlich" })}>Weiter</Button>
              </div>
            ) : (
              <div className="flex flex-col divide-y max-h-[80dvh] overflow-scroll">
                <div>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder='Bild URL'
                    className='text-white placeholder:text-neutral-400/50 mb-1'
                    disabled={!!selectedImageFile}
                  />
  
                  <div className='flex gap-1'>
                    <Input
                      type="file"
                      accept=".jpg, .jpeg, .png"
                      onChange={(e) => e.target.files && setSelectedImageFile(e.target.files[0])}
                      className='text-white placeholder:text-neutral-400/50 mb-1'
                    />
                    {selectedImageFile && (
                      <Button variant="destructive" onClick={handleRemoveSelectedImage}>
                        <FaTrash />
                      </Button>
                    )}
                  </div>
  
                  <div className='flex items-center gap-2 mt-2 mb-4'>
                    <Switch checked={imageInsight} onCheckedChange={setImageInsight} />
                    <p className='text-sm'>Vorschaubild anzeigen</p>
                  </div>
  
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder='Beschreibung'
                    className='text-white placeholder:text-neutral-400/50 mb-6 mt-2'
                  />
                </div>
                {fields.map((field, index) => (
                  <div key={index} className="flex flex-col gap-2 py-6">
                    <Input
                      value={field.name}
                      onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                      placeholder="Feldname"
                      className='text-white placeholder:text-neutral-400/50'
                    />
                    {field.list ? (
                      <Textarea value={field.value} onChange={(e) => handleFieldChange(index, 'value', e.target.value)} placeholder="Liste" className='text-white placeholder:text-neutral-400/50'/>
                    ) : field.address ? (
                      <div className='flex flex-col gap-2 h-fit relative'>
                          <Input
                            value={field.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {handleFieldChange(index, 'value', e.target.value);}}
                            placeholder="Adresse"
                            className='text-white placeholder:text-neutral-400/50'
                          />
  
                          <AddressSelector onAddressSelect={(address, coordinates) => handleAddressSelect(index, address, coordinates)} />
                        </div>
                    ) : (
                      <Input
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        placeholder="Feldwert"
                        className='text-white placeholder:text-neutral-400/50'
                      />
                    )}
                    <div className='flex justify-between gap-2'>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className='text-white'>
                              {field.icon ? React.createElement(FaIcons[field.icon as keyof typeof FaIcons]) : <FaIcons.FaImage />}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4 overflow-scroll bg-background fill-white text-white">
                            <Input
                              value={iconSearch}
                              onChange={(e) => setIconSearch(e.target.value)}
                              placeholder="Icon suchen"
                              className='mb-2'
                            />
                            <ScrollArea>
                              <div className='grid grid-cols-4 gap-2 h-48'>
                                <Button
                                  variant="ghost"
                                  onClick={() => handleFieldChange(index, 'icon', '')}
                                  className='text-red-500'
                                >
                                  <FaIcons.FaXmark />
                                </Button>
                                {lastUsedIcons.map((iconName: string) => (
                                  <Button
                                    key={iconName}
                                    variant="ghost"
                                    onClick={() => {
                                      handleFieldChange(index, 'icon', iconName);
                                      saveLastUsedIcon(iconName);
                                    }}
                                    className={field.icon === iconName ? 'border border-white/30' : ''}
                                  >
                                    {React.createElement((FaIcons as any)[iconName])}
                                  </Button>
                                ))}
                                {filteredIcons.map(iconName => (
                                  <Button
                                    key={iconName}
                                    variant="ghost"
                                    onClick={() => {
                                      handleFieldChange(index, 'icon', iconName);
                                      saveLastUsedIcon(iconName);
                                    }}
                                    className={field.icon === iconName ? 'border' : ''}
                                  >
                                    {React.createElement((FaIcons as any)[iconName])}
                                  </Button>
                                ))}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                
                          <div className='flex gap-2'>
                            <Toggle
                            variant="outline"
                            className='px-4'
                            pressed={field.link}
                            onPressedChange={(pressed) => handleFieldChange(index, 'link', pressed)}
                            disabled={field.gremium || field.list || field.address}
                          >
                            <FaIcons.FaLink />
                          </Toggle>
  
                          <Toggle
                            variant="outline"
                            className='px-4'
                            pressed={field.gremium}
                            onPressedChange={(pressed) => handleFieldChange(index, 'gremium', pressed)}
                            disabled={field.link || field.list || field.address}
                            >
                              <FaIcons.FaListUl />
                          </Toggle>
  
                          <Toggle
                            variant="outline"
                            className='px-4'
                            pressed={field.list}
                            onPressedChange={(pressed) => handleFieldChange(index, 'list', pressed)}
                            disabled={field.link || field.gremium || field.address}
                            >
                              <FaIcons.FaBars />
                            </Toggle>
  
                            <Toggle
                            variant="outline"
                            className='px-4'
                            pressed={field.address}
                            onPressedChange={(pressed) => handleFieldChange(index, 'address', pressed)}
                            disabled={field.link || field.gremium || field.list}
                          >
                            <FaIcons.FaLocationCrosshairs />
                          </Toggle>
                          </div>
                          <Button variant="destructive" onClick={() => handleRemoveField(index)}><FaTrash/></Button>
                    </div>
                  </div>
                ))}
                <Button onClick={handleAddField}><span className='text-xl'>+</span> Neues Feld</Button>
                <Button variant="secondary" onClick={handleSaveProduct} className='mt-4'>Speichern</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
  
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={objects.map(obj => obj.id)} strategy={verticalListSortingStrategy}>
            {categories.map(category => (
              <div key={category.id} className="mb-4">
                <h3 className="text-md mt-5 font-semibold text-white flex gap-4 items-center">{category.name} <div className='flex-1 h-[1px] bg-white/10'/></h3>
                {filteredObjects(objects).filter(obj => obj.category === category.id).map((obj, index) => (
                  <SortableItem key={obj.id} id={obj.id}>
                    {(listeners: any) => (
                      <div className={`flex py-[6px] gap-2 items-center border-[#ffffff14] border-b overflow-hidden ${obj.isDeleted ? 'opacity-50' : ''}`}>
                        <span className='handle text-white mr-4' {...listeners}><FaGrip /></span>
                        <div className='flex-1'>
                          <p className='text-neutral-100/80 text-sm'>{obj.name}</p>
                        </div>
                        <Button variant="outline" onClick={() => handleEditObject(obj)}>Bearbeiten</Button>
                        <Button variant="destructive" onClick={() => handleRemoveObject(obj.id, obj.category)}><FaTrash /></Button>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </div>
            ))}
          </SortableContext>
        </DndContext>
        {hasChanges && <Button variant="secondary" onClick={handleSaveChanges} className='absolute -bottom-12 left-0'>Änderungen speichern</Button>}
      </>
    );
  };

export default ObjectsEditor;