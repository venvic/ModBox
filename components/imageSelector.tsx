'use client'

import React, { useEffect, useState } from 'react';
import { getStorage, ref, listAll, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FaX } from 'react-icons/fa6';

const storage = getStorage();

const ImageSelector = ({ moduleId, onImageSelect }: { moduleId: string, onImageSelect: (url: string) => void }) => {
    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchImages = async () => {
            setIsLoading(true);
            const imagesRef = ref(storage, `/IMAGES/${moduleId}/`);
            const result = await listAll(imagesRef);
            const urls = await Promise.all(result.items.map(item => getDownloadURL(item)));
            setImages(urls);
            setIsLoading(false);
        };
        fetchImages();
    }, [moduleId]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const fileRef = ref(storage, `/IMAGES/${moduleId}/${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            setImages(prev => [...prev, url]);
        }
    };

    const handleDelete = async (url: string) => {
        const fileRef = ref(storage, url.replace(/.*\/IMAGES\//, '/IMAGES/'));
        await deleteObject(fileRef);
        setImages(prev => prev.filter(image => image !== url));
        if (selectedImage === url) setSelectedImage(null);
    };

    const handleConfirmSelection = () => {
        if (selectedImage) {
            onImageSelect(selectedImage);
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className='w-fit' onClick={() => setIsOpen(true)}>Bild auswählen</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bilder verwalten</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid grid-cols-3 gap-4">
                        {isLoading ? (
                            <p>Lade Bilder...</p>
                        ) : (
                            images.map((image) => (
                                <div key={image} className="relative">
                                    <img
                                        src={image}
                                        alt="Logo"
                                        className={`w-32 h-32 p-2 object-contain cursor-pointer border ${selectedImage === image ? 'border-blue-500' : 'border-transparent'}`}
                                        onClick={() => setSelectedImage(image)}
                                    />
                                    <button
                                        className="absolute top-1 right-5 border border-red-500 bg-red-600/80 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                        onClick={() => handleDelete(image)}
                                    >
                                        <FaX className='h-[10px] w-[10px]'/>
                                    </button>
                                </div>
                            ))
                        )}
                        <label className="flex items-center justify-center w-32 h-32 border border-dashed cursor-pointer">
                            <span>+</span>
                            <input type="file" className="hidden" onChange={handleUpload} />
                        </label>
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        variant="secondary"
                        onClick={handleConfirmSelection} 
                        disabled={!selectedImage}
                        className='w-full mt-6'
                    >
                        Bestätigen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImageSelector;
