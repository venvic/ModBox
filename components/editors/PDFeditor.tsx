'use client'
import React, { useState, useEffect, JSX } from 'react'
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { uploadFileToDatabase, uploadFileToStorage, getFilesFromDatabase, deleteFileFromStorage } from '@/utils/database';
import { Label } from '../ui/label';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '../ui/tabs';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGrip, FaTrash } from 'react-icons/fa6';
import { toast } from 'sonner';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/database';


if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();


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

const PDFeditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
    const [sort, setSort] = useState(1);
    const { register, handleSubmit, watch, reset, setValue } = useForm();
    const [file, setFile] = useState<File | null>(null);
    const [fileID, setFileID] = useState<string>('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [files, setFiles] = useState<any[]>([]);
    const [deletedFiles, setDeletedFiles] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingFileId, setEditingFileId] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, [id, productId]);

    const fetchFiles = async () => {
        const filesList = (await getFilesFromDatabase(productId, id)).map((file: { id: string, [key: string]: any }) => ({ ...file, sort: file.sort ?? 0 }));
        filesList.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        setFiles(filesList);
    };

    useEffect(() => {
        setFileID(Math.random().toString(36).substring(2, 12));
    }, [dialogOpen]);

    const generateRandomFileSize = () => {
        return Math.floor(Math.random() * (5 * 1024 * 1024 - 1 * 1024 * 1024) + 1 * 1024 * 1024);
    };

    const onSubmit = async (data: any) => {
        const { name, url } = data;
        let fileSize = file ? file.size : 0;
        let link = url;

        if (file) {
            link = await uploadFileToStorage(productId, id, fileID, file);
        } else if (url) {
            fileSize = generateRandomFileSize();
        }

        const newFile = {
            link,
            name,
            size: fileSize,
            sort: editingFileId ? files.find(file => file.id === editingFileId)?.sort : files.length + 1
        };

        if (editingFileId) {
            await uploadFileToDatabase(productId, id, editingFileId, newFile);
        } else {
            await uploadFileToDatabase(productId, id, fileID, newFile);
        }

        setSort(sort + 1);
        reset();
        setFile(null);
        setDialogOpen(false);
        setEditingFileId(null);
        toast.success("Datei gespeichert", { description: `${new Date().toLocaleTimeString()}` });
        fetchFiles();
    };

    const handleRemoveFile = (fileId: string) => {
        const updatedFiles = files.map(file => file.id === fileId ? { ...file, markedForDeletion: true } : file);
        const sortedFiles = updatedFiles
            .filter(file => !file.markedForDeletion)
            .map((file, index) => ({
                ...file,
                sort: index + 1,
            }));
        setFiles([...sortedFiles, ...updatedFiles.filter(file => file.markedForDeletion)]);
        setDeletedFiles([...deletedFiles, fileId]);
        setHasChanges(true);
    };

    const handleEditFile = (fileId: string, newName: string) => {
        const updatedFiles = files.map(file => file.id === fileId ? { ...file, name: newName } : file);
        setFiles(updatedFiles);
        setHasChanges(true);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = files.findIndex(file => file.id === active.id);
            const newIndex = files.findIndex(file => file.id === over.id);
            const newFiles = arrayMove(files, oldIndex, newIndex).map((file, index) => ({
                ...file,
                sort: index + 1,
            }));
            setFiles(newFiles);
            setHasChanges(true);
        }
    };

    const handleSaveChanges = async () => {
        const batch = writeBatch(db);
        files.forEach((file) => {
            if (!file.markedForDeletion) {
                const fileRef = doc(db, `product/${productId}/modules/${id}/files`, file.id);
                batch.set(fileRef, file);
            }
        });
        for (const fileId of deletedFiles) {
            const fileRef = doc(db, `product/${productId}/modules/${id}/files`, fileId);
            batch.delete(fileRef);
            const fileToRemove = files.find(file => file.id === fileId);
            if (fileToRemove && fileToRemove.link.startsWith('https://firebasestorage')) {
                try {
                    await deleteFileFromStorage(productId, id, fileId);
                } catch (error) {
                    console.error(`Error deleting file from storage: ${fileId}`, error);
                }
            }
        }
        await batch.commit();
        setDeletedFiles([]);
        setHasChanges(false);
        toast.success("Änderungen gespeichert", { description: `${new Date().toLocaleTimeString()}` });
        fetchFiles();
        onChangesSaved(); // Notify that changes have been saved
    };

    const filteredFiles = files.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className='flex flex-col w-full h-full relative'>
            <div className='w-full flex gap-4 mb-10'>
                <Input placeholder='Suche...' className='text-foreground placeholder:text-neutral-100/50' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant='secondary'>PDF hochladen</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader className='w-full mb-4'>
                            <DialogTitle className='text-center'>PDF Hochladen</DialogTitle>
                            <DialogDescription className='text-neutral-300/80 text-center'>
                                Geben Sie einen Namen ein und entweder eine URL oder laden Sie eine PDF-Datei hoch.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <Label>Name</Label>
                            <Input className='text-foreground placeholder:text-foreground/60 my-2' placeholder='Name' {...register('name', { required: true })} />

                            <Tabs defaultValue="upload" className="min-w-[full] mt-4">
                                <TabsList className='bg-primary w-full text-foreground/70'>
                                    <TabsTrigger className='w-full' value="upload">File hochladen</TabsTrigger>
                                    <TabsTrigger className='w-full' value="url">URL</TabsTrigger>
                                </TabsList>
                                <TabsContent value="upload">
                                    {file ? (
                                        <div className='flex items-center justify-between'>
                                            <span>{file.name}</span>
                                            <Button variant='ghost' onClick={() => setFile(null)}>X</Button>
                                        </div>
                                    ) : (
                                        <Input className='h-24 border-dashed text-center flex flex-col file:w-full file:h-full' type='file' accept='application/pdf' onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={!!watch('url')}/>
                                    )}
                                </TabsContent>
                                <TabsContent value="url">
                                    <Input className='text-foreground placeholder:text-foreground/60 my-2' placeholder="https://example.com/document.pdf" {...register('url')} disabled={!!file} />
                                </TabsContent>
                            </Tabs>

                            <DialogFooter>
                                <Button type='submit' className='mt-4' variant="secondary" disabled={!watch('name') || (!file && !watch('url'))}>Save</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredFiles.map(file => file.id)} strategy={verticalListSortingStrategy}>
                    {filteredFiles.map((file) => (
                        <SortableItem key={file.id} id={file.id}>
                            {(listeners: any) => (
                                <div className={`flex my-[4px] gap-2 items-center overflow-y-scroll ${file.markedForDeletion ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <span className='handle text-foreground mr-4' {...listeners}><FaGrip /></span>
                                    <div className='flex-1'>
                                        <input
                                            className='bg-transparent w-full border-none text-neutral-100/80 text-sm'
                                            value={file.name}
                                            onChange={(e) => handleEditFile(file.id, e.target.value)}
                                            disabled={file.markedForDeletion}
                                        />
                                    </div>
                                    <Button variant="destructive" onClick={() => handleRemoveFile(file.id)}><FaTrash /></Button>
                                </div>
                            )}
                        </SortableItem>
                    ))}
                </SortableContext>
            </DndContext>
            {hasChanges && <Button variant="secondary" onClick={handleSaveChanges} className='mt-auto w-fit'>Änderungen speichern</Button>}
        </div>
    )
}

export default PDFeditor;