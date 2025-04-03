import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState, useEffect } from "react";
import KontaktDetailsDialog from "@/components/editors/kontaktmodul/addKontaktfeld";
import EditKontaktDialog from "@/components/editors/kontaktmodul/editKontaktfeld";
import { JSONContent } from '@tiptap/core';
import { getFirestore, doc, collection, getDocs, getDoc, setDoc, writeBatch } from "firebase/firestore";
import getRandomId from "@/utils/getRandomId";
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGrip, FaTrash, FaGears, FaPhone, FaFax, FaEnvelope, FaGlobe, FaLocationDot, FaRegFileLines, FaX } from 'react-icons/fa6';
import { JSX } from 'react'
import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL } from "firebase/storage";
import ImageSelector from '../imageSelector';

type Kontakt = {
    sort: number;
    id: string;
    type: string;
    value: string | JSONContent;
    address?: string;
    addressLocation?: { lat: number, lng: number };
    title?: string;
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

const getIconForType = (type: string) => {
    switch (type) {
        case "Telefon":
            return <FaPhone />;
        case "Fax":
            return <FaFax />;
        case "Email":
            return <FaEnvelope />;
        case "Website":
            return <FaGlobe />;
        case "Ort":
            return <FaLocationDot />;
        case "Text":
            return <FaRegFileLines />;
        default:
            return null;
    }
};

const KontaktmodulEditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [kontakte, setKontakte] = useState<Kontakt[]>([]);
    const [nextSort, setNextSort] = useState(1);
    const [selectedKontakt, setSelectedKontakt] = useState<Kontakt | null>(null);
    const [isSaveEnabled, setIsSaveEnabled] = useState(false);
    const [deletedKontakte, setDeletedKontakte] = useState<string[]>([]);
    const db = getFirestore();

    const [moduleName, setModuleName] = useState("");
    const [moduleDescription, setModuleDescription] = useState("");
    const [originalModuleName, setOriginalModuleName] = useState("");
    const [originalModuleDescription, setOriginalModuleDescription] = useState("");

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchFields = async () => {
            const fieldsCollection = collection(db, `product/${productId}/modules/${id}/fields`);
            const snapshot = await getDocs(fieldsCollection);
            const fields = snapshot.docs.map(doc => doc.data() as Kontakt);
            fields.sort((a, b) => a.sort - b.sort);
            setKontakte(fields);
            setNextSort(fields.length + 1);
        };

        fetchFields();
    }, [db, id, productId]);

    useEffect(() => {
        const fetchModuleDetails = async () => {
            const moduleDoc = doc(db, `product/${productId}/modules/${id}`);
            const moduleSnapshot = await getDoc(moduleDoc);
            if (moduleSnapshot.exists()) {
                const data = moduleSnapshot.data();
                if (data.logoUrl) {
                    const storage = getStorage();
                    const fileRef = ref(storage, data.logoUrl);
                    const downloadUrl = await getDownloadURL(fileRef);
                    setLogoUrl(downloadUrl);
                } else {
                    setLogoUrl(null);
                }
                setModuleName(data.name || "");
                setModuleDescription(data.description || "");
                setOriginalModuleName(data.name || "");
                setOriginalModuleDescription(data.description || "");
                setOriginalLogoUrl(data.logoUrl || null);
            }
        };

        fetchModuleDetails();
    }, [db, id, productId]);

    useEffect(() => {
        if (moduleName !== originalModuleName || moduleDescription !== originalModuleDescription) {
            setIsSaveEnabled(true);
        } else {
            setIsSaveEnabled(false);
        }
    }, [moduleName, moduleDescription, originalModuleName, originalModuleDescription]);

    const handleSaveKontakt = async (kontakt: Omit<Kontakt, "id" | "sort">) => {
        const fieldId = getRandomId(undefined, 8);
        const newKontakt = { ...kontakt, id: fieldId, sort: nextSort };

        const sanitizedKontakt = Object.fromEntries(
            Object.entries(newKontakt).filter(([_, value]) => value !== undefined)
        );

        try {
            const fieldDoc = doc(db, `product/${productId}/modules/${id}/fields/${fieldId}`);
            await setDoc(fieldDoc, sanitizedKontakt);
            setKontakte((prev) => [...prev, newKontakt]);
            setNextSort((prev) => prev + 1);
        } catch (error) {
            console.error("Error saving contact to Firestore:", error);
        }finally {
            onChangesSaved();
        }
    };

    const handleEditKontakt = async (updatedKontakt: Kontakt) => {
        try {
            const sanitizedKontakt = Object.fromEntries(
                Object.entries(updatedKontakt).filter(([_, v]) => v !== undefined)
            );

            const fieldDoc = doc(db, `product/${productId}/modules/${id}/fields/${updatedKontakt.id}`);
            await setDoc(fieldDoc, sanitizedKontakt, { merge: true });

            setKontakte((prev) =>
                prev.map((kontakt) => (kontakt.id === updatedKontakt.id ? sanitizedKontakt as Kontakt : kontakt))
            );

            onChangesSaved();
        } catch (error) {
            console.error("Error updating contact in Firestore:", error);
        }
    };

    const handleDeleteKontakt = (kontaktId: string) => {
        setDeletedKontakte((prev) => [...prev, kontaktId]);
        setKontakte((prev) => {
            const updated = prev
                .filter((kontakt) => kontakt.id !== kontaktId) 
                .map((kontakt, index) => ({
                    ...kontakt,
                    sort: index + 1, 
                }));
            setIsSaveEnabled(true);
            return updated;
        });
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = kontakte.findIndex((kontakt) => kontakt.id === active.id);
            const newIndex = kontakte.findIndex((kontakt) => kontakt.id === over.id);
            const newKontakte = arrayMove(kontakte, oldIndex, newIndex).map((kontakt, index) => ({
                ...kontakt,
                sort: index + 1,
            }));
            setKontakte(newKontakte);
            setIsSaveEnabled(true);
        }
    };

    const handleSaveChanges = async () => {
        try {
            const batch = writeBatch(db);

            kontakte.forEach((kontakt) => {
                const fieldDoc = doc(db, `product/${productId}/modules/${id}/fields/${kontakt.id}`);
                batch.set(fieldDoc, { sort: kontakt.sort }, { merge: true });
            });

            deletedKontakte.forEach((kontaktId) => {
                const fieldDoc = doc(db, `product/${productId}/modules/${id}/fields/${kontaktId}`);
                batch.delete(fieldDoc);
            });

            const moduleDoc = doc(db, `product/${productId}/modules/${id}`);
            batch.set(moduleDoc, { name: moduleName, description: moduleDescription }, { merge: true });

            await batch.commit();
            setDeletedKontakte([]);
            setOriginalModuleName(moduleName);
            setOriginalModuleDescription(moduleDescription);
            setIsSaveEnabled(false);

            onChangesSaved();
        } catch (error) {
            console.error("Error saving changes to Firestore:", error);
        }
    };

    const handleUploadLogo = async (file: File) => {
        try {
            const storage = getStorage();
            const filePath = `IMAGES/${id}/${getRandomId(undefined, 8)}/${file.name}`;
            const fileRef = ref(storage, filePath);

            if (originalLogoUrl) {
                try {
                    const oldFileRef = ref(storage, originalLogoUrl);
                    await deleteObject(oldFileRef);
                } catch (error) {
                    console.warn("Previous logo not found, skipping deletion.");
                }
            }

            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            const moduleDoc = doc(db, `product/${productId}/modules/${id}`);
            await setDoc(moduleDoc, { logoUrl: filePath }, { merge: true });

            setLogoUrl(downloadUrl);
            setOriginalLogoUrl(filePath);
            setIsSaveEnabled(true);
        } catch (error) {
            console.error("Error uploading logo:", error);
        }
    };

    const handleRemoveLogo = async () => {
        try {
            if (originalLogoUrl) {
                try {
                    const storage = getStorage();
                    const fileRef = ref(storage, originalLogoUrl);
                    await deleteObject(fileRef);
                } catch (error) {
                    console.warn("Logo not found, skipping deletion.");
                }

                const moduleDoc = doc(db, `product/${productId}/modules/${id}`);
                await setDoc(moduleDoc, { logoUrl: null }, { merge: true });

                setLogoUrl(null);
                setOriginalLogoUrl(null);
                setIsSaveEnabled(false);
            }
        } catch (error) {
            console.error("Error removing logo:", error);
        }
    };

    const handleLogoSelect = async (url: string) => {
        try {
            const moduleDoc = doc(db, `product/${productId}/modules/${id}`);
            await setDoc(moduleDoc, { logoUrl: url }, { merge: true });
            setLogoUrl(url);
            setOriginalLogoUrl(url);
            setIsSaveEnabled(true);
        } catch (error) {
            console.error("Error setting logo URL:", error);
        }
    };

    return (
        <div className="flex flex-col w-full h-full relative divide-y">
            <div className="h-fit w-full gap-6 flex flex-row pb-16">
                <div className="flex flex-col w-fit gap-2">
                    <h2>Logo</h2>
                    {logoUrl ? (
                        <div className="relative">
                            <img src={logoUrl} alt="Logo" className="h-36 w-36 p-3 bg-neutral-500/25 border rounded-sm object-cover" />
                        </div>
                    ) : (
                        <div className="h-32 w-32 rounded-sm bg-neutral-500" />
                    )}
                    <div className="flex w-full gap-2">
                        <ImageSelector
                            moduleId={id}
                            onImageSelect={handleLogoSelect}
                        />
                        <Button
                            variant="destructive"
                            className="text-destructive-foreground px-3"
                            onClick={handleRemoveLogo}
                        >
                            <FaX className="max-h-3 max-w-3" />
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col w-full">
                    <h2>Name</h2>
                    <Input
                        type="text"
                        className="input mt-[3px] w-full"
                        placeholder="Name"
                        value={moduleName}
                        onChange={(e) => setModuleName(e.target.value)}
                    />
                    <h2 className="mt-2">Name Addon</h2>
                    <Input
                        type="text"
                        className="input mt-[3px] w-full"
                        placeholder="Description"
                        value={moduleDescription}
                        onChange={(e) => setModuleDescription(e.target.value)}
                    />
                </div> 
            </div>

            <div className="py-16 min-h-64">
                <div className="flex w-full flex-row justify-between items-center">
                    <h1>Kontakt Details</h1>
                    <KontaktDetailsDialog
                        isOpen={isDialogOpen}
                        onOpenChange={setIsDialogOpen}
                        onSave={handleSaveKontakt}
                        existingKontakte={kontakte}
                        moduleId={id} 
                    />
                </div>
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={kontakte.map((kontakt) => kontakt.id)} strategy={verticalListSortingStrategy}>
                        {kontakte
                            .sort((a, b) => a.sort - b.sort)
                            .map((kontakt) => (
                                <SortableItem key={kontakt.id} id={kontakt.id}>
                                    {(listeners: any) => (
                                        <div
                                            className="flex items-center gap-4 py-2 border-b"
                                            style={{ opacity: deletedKontakte.includes(kontakt.id) ? 0.5 : 1 }}
                                        >
                                            <span className="handle text-neutral-700" {...listeners}>
                                                <FaGrip />
                                            </span>
                                            <div className="flex-1 flex items-center gap-2">
                                                {getIconForType(kontakt.type)}
                                                <span>
                                                    {kontakt.type} - {typeof kontakt.value === "string" 
                                                        ? (kontakt.value.length > 25 
                                                            ? `${kontakt.value.slice(0, 25)}...` 
                                                            : kontakt.value) 
                                                        : JSON.stringify(kontakt.value).length > 25 
                                                            ? `${JSON.stringify(kontakt.value).slice(0, 25)}...` 
                                                            : JSON.stringify(kontakt.value)}
                                                </span>
                                            </div>
                                            <button
                                                className="text-neutral-400"
                                                onClick={() => {
                                                    setSelectedKontakt(kontakt);
                                                    setIsEditDialogOpen(true);
                                                }}
                                            >
                                                <FaGears />
                                            </button>
                                            <button
                                                className="text-red-500"
                                                onClick={() => handleDeleteKontakt(kontakt.id)}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    )}
                                </SortableItem>
                            ))}
                    </SortableContext>
                </DndContext>
            </div>

            <EditKontaktDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                kontakt={selectedKontakt}
                onSave={handleEditKontakt}
                moduleId={id}
            />

            <div className="py-16">
                <Button onClick={handleSaveChanges} variant="secondary" disabled={!isSaveEnabled}>
                    Änderungen Speichern
                </Button>
            </div>
        </div>
    );
};

export default KontaktmodulEditor;