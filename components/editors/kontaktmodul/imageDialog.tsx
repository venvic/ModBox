import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getStorage, ref, listAll, getDownloadURL, uploadBytes, deleteObject } from "firebase/storage";
import getRandomId from "@/utils/getRandomId";

const ImageDialog = ({ isOpen, onOpenChange, onSelectImage, moduleId }: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    onSelectImage: (url: string) => void; 
    moduleId: string; 
}) => {
    const [images, setImages] = useState<{ url: string; path: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchImages = async () => {
                const storage = getStorage();
                const folderRef = ref(storage, `IMAGES/${moduleId}`);
                try {
                    console.log("Fetching images from folder:", `IMAGES/${moduleId}`);
                    const allImages: { url: string; path: string }[] = [];

                    const fetchFromFolder = async (folderRef: any) => {
                        const result = await listAll(folderRef);
                        for (const item of result.items) {
                            const url = await getDownloadURL(item);
                            allImages.push({ url, path: item.fullPath });
                        }
                        for (const prefix of result.prefixes) {
                            await fetchFromFolder(prefix); // fetch from subfolders
                        }
                    };

                    await fetchFromFolder(folderRef);
                    setImages(allImages);
                    console.log("Fetched images:", allImages);
                } catch (error: any) {
                    console.error("Error fetching images:", error);
                    if (error.code === "storage/object-not-found") {
                        console.warn("The folder does not exist or is empty.");
                    }
                }
            };
            fetchImages();
        }
    }, [isOpen, moduleId]);

    const handleUpload = async (file: File) => {
        setIsUploading(true);
        const storage = getStorage();
        const filePath = `IMAGES/${moduleId}/${getRandomId(undefined, 8)}/${file.name}`;
        const fileRef = ref(storage, filePath);
        try {
            console.log("Uploading file to:", filePath);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            console.log("Uploaded URL:", downloadUrl);
            setImages((prev) => [...prev, { url: downloadUrl, path: filePath }]);
        } catch (error) {
            console.error("Error uploading image:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (path: string) => {
        const storage = getStorage();
        const fileRef = ref(storage, path);
        try {
            console.log("Deleting file at path:", path);
            await deleteObject(fileRef);
            setImages((prev) => prev.filter((image) => image.path !== path));
        } catch (error) {
            console.error("Error deleting image:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bild auswählen oder hochladen</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-2">
                        {images.map(({ url, path }, index) => (
                            <div key={index} className="relative w-24 h-24 border rounded">
                                <img
                                    src={url}
                                    alt={`Image ${index}`}
                                    className="w-full h-full object-cover cursor-pointer bg-neutral-500/40 p-2 rounded"
                                    onClick={() => {
                                        onSelectImage(url);
                                        onOpenChange(false);
                                    }}
                                />
                                <button
                                    className="absolute top-1 right-1 bg-red-500 text-foreground rounded-full px-1 text-[10px] font-bold"
                                    onClick={() => handleDelete(path)}
                                >
                                    X
                                </button>
                            </div>
                        ))}
                    </div>
                    <Button
                        className="w-full"
                        onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = async (event: any) => {
                                const file = event.target.files[0];
                                if (file) {
                                    await handleUpload(file);
                                }
                            };
                            input.click();
                        }}
                        disabled={isUploading}
                    >
                        {isUploading ? "Hochladen..." : "Bild hochladen"}
                    </Button>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Abbrechen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImageDialog;
