'use client'
import { firebaseConfig } from '@/database';
import { initializeApp } from 'firebase/app';
import { collection, doc, getDoc, getDocs, getFirestore, query, setDoc, writeBatch } from 'firebase/firestore';
import React, { useEffect, useState, JSX } from 'react'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { HexColorPicker } from "react-colorful";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'; // Assuming you have a sheet component
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'; // Assuming you have a tabs component
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGrip, FaPlus, FaTrash } from 'react-icons/fa6';
import { toast } from 'sonner';
import { Toggle } from '../ui/toggle';
import { Switch } from '../ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import * as allIcons from 'react-icons/fa6';
import getRandomId from '@/utils/getRandomId';

const db = getFirestore(initializeApp(firebaseConfig));

type Tile = {
    id: string;
    title: string;
    url: string;
    isIframe: boolean;
    sort: number;
    icon: string;
}

const SortableTile = ({ id, children }: { id: string, children: (listeners: any) => JSX.Element }) => {
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

const IconSelector = ({ selectedIcon, onIconSelect }: { selectedIcon: string, onIconSelect: (icon: string) => void }) => {
    const [search, setSearch] = useState('');
    const icons = Object.keys(allIcons).filter(icon => icon.toLowerCase().includes(search.toLowerCase()));

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-fit">
                    {selectedIcon ? React.createElement(allIcons[selectedIcon as keyof typeof allIcons]) : <allIcons.FaMagnifyingGlass />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 h-64 bg-muted text-white overflow-y-scroll">
                <Input
                    placeholder="Suche icons..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mb-2 text-white placeholder:text-neutral-200/50"
                />
                <div className="grid grid-cols-4 gap-2">
                    {icons.map(icon => (
                        <Button key={icon} variant="ghost" onClick={() => onIconSelect(icon)}>
                            {React.createElement(allIcons[icon as keyof typeof allIcons])}
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const TilesSheet = React.memo(({ tiles, setTiles, moduleId, productId, onChangesSaved }: { tiles: Tile[], setTiles: (tiles: Tile[]) => void, moduleId: string, productId: string, onChangesSaved: () => void }) => {
    const [deletedTiles, setDeletedTiles] = useState<string[]>([]);

    const handleTitleChange = (index: number, newTitle: string) => {
        const updatedTiles = [...tiles];
        updatedTiles[index].title = newTitle;
        setTiles(updatedTiles);
    };

    const handleUrlChange = (index: number, newUrl: string) => {
        const updatedTiles = [...tiles];
        updatedTiles[index].url = newUrl;
        setTiles(updatedTiles);
    };

    const handleIsIframeChange = (index: number, newIsIframe: boolean) => {
        const updatedTiles = [...tiles];
        updatedTiles[index].isIframe = newIsIframe;
        setTiles(updatedTiles);
    };

    const handleIconChange = (index: number, newIcon: string) => {
        const updatedTiles = [...tiles];
        updatedTiles[index].icon = newIcon;
        setTiles(updatedTiles);
    };

    const handleRemoveTile = (index: number, event: React.MouseEvent) => {
        event.stopPropagation();
        const tileToRemove = tiles[index];
        if (tileToRemove.id) {
            setDeletedTiles([...deletedTiles, tileToRemove.id]);
        }
        const updatedTiles = tiles.filter((_, i) => i !== index);
        const sortedTiles = updatedTiles.map((tile, i) => ({
            ...tile,
            sort: i + 1,
        }));
        setTiles(sortedTiles);
    };

    const handleAddTile = () => {
        const newTile = { title: '', url: '', isIframe: false, sort: tiles.length + 1, id: getRandomId(undefined, 5), icon: '' };
        setTiles([...tiles, newTile]);
    };

    const handleSaveChanges = async () => {
        const batch = writeBatch(db);
        tiles.forEach((tile) => {
            const tileRef = doc(db, `product/${productId}/modules/${moduleId}/tiles`, tile.id);
            batch.set(tileRef, tile);
        });
        deletedTiles.forEach((tileId) => {
            const tileRef = doc(db, `product/${productId}/modules/${moduleId}/tiles`, tileId);
            batch.delete(tileRef);
        });
        await batch.commit();
        setDeletedTiles([]);
        toast.success("Gespeichert", { description: `${new Date().toLocaleTimeString()}` });
        onChangesSaved();
    };

    const handleDragEndTiles = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = tiles.findIndex(tile => tile.id === active.id);
            const newIndex = tiles.findIndex(tile => tile.id === over.id);
            const newTiles = arrayMove(tiles, oldIndex, newIndex).map((tile, index) => ({
                ...tile,
                sort: index + 1,
            }));
            setTiles(newTiles);
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button className='w-full'>Kacheln</Button>
            </SheetTrigger>
            <SheetContent className="min-w-[700px]">
                <SheetHeader>
                    <SheetTitle className='text-white'>Kacheln bearbeiten</SheetTitle>
                    <SheetDescription className='text-neutral-300'>Bearbeiten Sie die Kacheln</SheetDescription>
                </SheetHeader>
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndTiles}>
                    <SortableContext items={tiles} strategy={verticalListSortingStrategy}>
                        <div className='flex h-[calc(100%-100px)] flex-col gap-4 mt-10'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {tiles.map((tile, index) => (
                                    <SortableTile key={tile.id} id={tile.id}>
                                        {(listeners: any) => (
                                            <div className='flex gap-2 items-center overflow-y-scroll bg-muted rounded-md border p-2'>
                                                <span className='handle text-white px-3' {...listeners}><FaGrip /></span>
                                                <div className='flex-1 flex flex-col gap-2'>
                                                    <Input
                                                        value={tile.title}
                                                        onChange={(e) => handleTitleChange(index, e.target.value)}
                                                        placeholder='Kachel Titel'
                                                        className='text-white placeholder:text-neutral-200/50'
                                                    />
                                                    <Input
                                                        value={tile.url}
                                                        onChange={(e) => handleUrlChange(index, e.target.value)}
                                                        placeholder='Kachel URL'
                                                        className='text-white placeholder:text-neutral-200/50'
                                                    />
                                                    <div className='flex justify-between'>
                                                        <div className='flex gap-4 items-center'>
                                                            <IconSelector
                                                                selectedIcon={tile.icon}
                                                                onIconSelect={(icon) => handleIconChange(index, icon)}
                                                            />
                                                            <div className='flex items-center gap-2'>
                                                                <Switch
                                                                    checked={tile.isIframe}
                                                                    onCheckedChange={(checked) => handleIsIframeChange(index, checked)}
                                                                />
                                                                <Label className='text-neutral-500'>Als iFrame anzeigen</Label>    
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={(e) => handleRemoveTile(index, e)}
                                                        >
                                                            <FaTrash/>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </SortableTile>
                                ))}
                            </div>
                            <div className='flex flex-col mt-auto gap-3'>
                                <Button variant="outline" className='text-white' onClick={handleAddTile}><span className='text-lg mr-1'>+</span> Neue Kachel</Button>
                                <Button variant="secondary" onClick={handleSaveChanges}>Änderungen speichern</Button>
                            </div>
                        </div>
                    </SortableContext>
                </DndContext>
            </SheetContent>
        </Sheet>
    );
});

type Settings = {
    backgroundImgUrl: string;
    backgroundBlur: number;
    tileBlur: number;
    tilePadding: number;
    tileGap: number;
    tileColor: string;
    topBarColor: string;
    topBarPadding: number;
    topBarTitleColor: string;
    topBarLogos: string[]; // max 2
    topBarShowTime: boolean;
}

const defaultSettings: Settings = {
    backgroundImgUrl: 'https://firebasestorage.googleapis.com/v0/b/heimatinfo-d63b0.firebasestorage.app/o/BASIS%2FBild-Gaimersheim-Gleitschirm-1940-1024x576.jpg?alt=media&token=ba50c8a0-6bcd-4bb8-b02b-8fb1abf64351',
    backgroundBlur: 20,
    tileBlur: 20,
    tilePadding: 20,
    tileGap: 20,
    tileColor: '#FFFFFF',
    topBarColor: '#FFFFFF',
    topBarPadding: 20,
    topBarTitleColor: '#000000',
    topBarLogos: ['https://firebasestorage.googleapis.com/v0/b/heimatinfo-d63b0.firebasestorage.app/o/BASIS%2Fimages.png?alt=media&token=7c103a35-e5e8-4631-a66a-62e5894d3d58', 'https://firebasestorage.googleapis.com/v0/b/heimatinfo-d63b0.firebasestorage.app/o/BASIS%2Fimages.png?alt=media&token=7c103a35-e5e8-4631-a66a-62e5894d3d58'],
    topBarShowTime: true
};

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) => {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <div className="flex gap-2 items-center">
                <Input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 p-0"
                />
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full"
                    placeholder="#FFFFFF"
                />
            </div>
        </div>
    );
};

const TerminalEditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isModified, setIsModified] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const tilesCollectionRef = collection(db, `product/${productId}/modules/${id}/tiles`);
            const tilesQuery = query(tilesCollectionRef);
            const tilesSnapshot = await getDocs(tilesQuery);
            if (!tilesSnapshot.empty) {
                const tilesData = tilesSnapshot.docs.map(doc => doc.data() as Tile);
                setTiles(tilesData.sort((a, b) => a.sort - b.sort));
            }

            const settingsDocRef = doc(db, `product/${productId}/modules/${id}/settings/default`);
            const settingsDoc = await getDoc(settingsDocRef);
            if (settingsDoc.exists()) {
                setSettings(settingsDoc.data() as Settings);
            } else {
                await setDoc(settingsDocRef, defaultSettings);
                setSettings(defaultSettings);
            }
        };
        fetchData();
    }, [id, productId]);

    const handleSave = async () => {
        const settingsDocRef = doc(db, `product/${productId}/modules/${id}/settings/default`);
        await setDoc(settingsDocRef, settings);
        onChangesSaved();
        setIsModified(false);
    };

    const handleChange = (newSettings: Partial<Settings>) => {
        setSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
        setIsModified(true);
    };

    return (
        <div className='flex flex-col gap-6'>
            <Tabs defaultValue="general" className="w-[95%]">
                <TabsList className='text-neutral-500'>
                    <TabsTrigger value="general">Allgemein</TabsTrigger>
                    <TabsTrigger value="topbar">Top-Bar</TabsTrigger>
                    <TabsTrigger value="tiles">Kacheln</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
                    <Card className='h-fit py-5 bg-transparent border-none rounded-none text-white'>
                        <h2 className='text-base font-medium mb-4'>Hintergrund Einstellungen</h2>
                        <div className='flex flex-col'>
                            <Label className='ml-1 text-neutral-500'>URL</Label>
                            <Input 
                                className='w-full placeholder:text-neutral-400/60 mt-1 mb-4' 
                                placeholder='https://beispiel.com/bild'
                                value={settings.backgroundImgUrl}
                                onChange={(e) => handleChange({ backgroundImgUrl: e.target.value })}
                            />
                            <Label className='ml-1 mb-1 text-neutral-500'>Verschwommenheit</Label>
                            <Slider 
                                className='w-full rounded-md mt-2' 
                                max={50} 
                                step={1} 
                                onValueChange={(value) => handleChange({ backgroundBlur: value[0] })}
                            />
                            <Label className='ml-1 mt-6 mb-1 text-neutral-500'>Zeitanzeige</Label>
                            <Switch
                                checked={settings.topBarShowTime}
                                onCheckedChange={(checked) => handleChange({ topBarShowTime: checked })}
                            />
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="topbar">
                    <Card className='h-fit py-5 bg-transparent border-none rounded-none text-white'>
                        <h2 className='text-base font-medium mb-4'>Top-Bar Einstellungen</h2>
                        <div className="space-y-4">
                            <ColorInput
                                label="Top Bar Color"
                                value={settings.topBarColor}
                                onChange={(value) => handleChange({ topBarColor: value })}
                            />
                            <ColorInput
                                label="Text Farbe"
                                value={settings.topBarTitleColor}
                                onChange={(value) => handleChange({ topBarTitleColor: value })}
                            />
                            <div>
                                <Label className='ml-1 text-neutral-500'>Innen-Abstand</Label>
                                <Slider 
                                    className='w-full rounded-md mt-2 mb-5' 
                                    defaultValue={[settings.topBarPadding]} 
                                    max={50} 
                                    step={1} 
                                    onValueChange={(value) => handleChange({ topBarPadding: value[0] })}
                                />
                            </div>
                            <div>
                                <Label className='ml-1 text-neutral-500'>Icon 1</Label>
                                <Input 
                                    className='w-full placeholder:text-neutral-400/60 mt-0 mb-4' 
                                    placeholder='https://beispiel.com/bild1'
                                    value={settings.topBarLogos[0]}
                                    onChange={(e) => handleChange({ topBarLogos: [e.target.value, settings.topBarLogos[1]] })}
                                />
                            </div>
                            <div>
                                <Label className='ml-1 text-neutral-500'>Icon 2</Label>
                                <Input 
                                    className='w-full placeholder:text-neutral-400/60 mt-1 mb-4' 
                                    placeholder='https://beispiel.com/bild2'
                                    value={settings.topBarLogos[1]}
                                    onChange={(e) => handleChange({ topBarLogos: [settings.topBarLogos[0], e.target.value] })}
                                />
                            </div>
                        </div>
                    </Card>
                </TabsContent>
                <TabsContent value="tiles">
                    <Card className='h-fit py-5 bg-transparent border-none rounded-none text-white'>
                        <h2 className='text-base font-medium mb-4'>Kachel Einstellungen</h2>
                        <div>
                            <ColorInput
                                label="Hintergrund Farbe"
                                value={settings.tileColor}
                                onChange={(value) => handleChange({ tileColor: value })}
                            />
                            <Label className='ml-1 text-neutral-500'>Innen-Abstand</Label>
                            <Slider 
                                className='w-full rounded-md mt-2 mb-5' 
                                defaultValue={[settings.tilePadding]} 
                                max={50} 
                                step={1} 
                                onValueChange={(value) => handleChange({ tilePadding: value[0] })}
                            />

                            <Label className='ml-1 text-neutral-500'>Außen-Abstand</Label>
                            <Slider 
                                className='w-full rounded-md mt-2 mb-5' 
                                defaultValue={[settings.tileGap]} 
                                max={50} 
                                step={1} 
                                onValueChange={(value) => handleChange({ tileGap: value[0] })}
                            />

                            <Label className='ml-1 text-neutral-500'>Verschwommenheit</Label>
                            <Slider 
                                className='w-full rounded-md mt-2 mb-5' 
                                defaultValue={[settings.tileBlur]} 
                                max={50} 
                                step={1} 
                                onValueChange={(value) => handleChange({ tileBlur: value[0] })}
                            />
                        </div>
                    </Card>
                    <TilesSheet tiles={tiles} setTiles={setTiles} moduleId={id} productId={productId} onChangesSaved={onChangesSaved} />
                </TabsContent>
            </Tabs>

            <Button className='mt-auto w-fit' variant={isModified ? "secondary" : "default"} onClick={handleSave} disabled={!isModified}>Änderungen speichern</Button>
        </div>
    )
}

export default TerminalEditor;