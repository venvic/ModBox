'use client';

import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import AddressSelector from "@/components/addressSelector";
import { FaBold, FaEnvelope, FaFax, FaGlobe, FaImage, FaItalic, FaLocationDot, FaPhone, FaPlus, FaRegFileLines, FaTextSlash, FaUnderline } from "react-icons/fa6";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEditor, EditorContent } from '@tiptap/react'
import { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Heading from '@tiptap/extension-heading';
import ImageDialog from "@/components/editors/kontaktmodul/imageDialog";

type Kontakt = {
    id?: string;
    sort?: number;
    type: string;
    value: string | JSONContent;
    address?: string;
    addressLocation?: { lat: number, lng: number };
    title?: string;
};

const RichTextEditor = ({ value, onChange, moduleId }: { value: JSONContent; onChange: (content: JSONContent) => void; moduleId: string }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Bold,
            Italic,
            Underline,
            Image,
            Heading.configure({
                levels: [1, 2, 3],
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON());
        },
        editorProps: {
            attributes: {
              class: 'focus:outline-none prose prose-2xl',
            },
        },
    });

    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

    const handleImageSelect = (url: string) => {
        editor?.chain().focus().setImage({ src: url }).run();
    };

    return (
        <div className="p-2">
            <div className="grid grid-cols-auto-fit w-full gap-2 mb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
                <Toggle
                    pressed={editor?.isActive('bold')}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    disabled={!editor?.can().chain().focus().toggleBold().run()}
                >
                    <FaBold />
                </Toggle>
                <Toggle
                    pressed={editor?.isActive('italic')}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    disabled={!editor?.can().chain().focus().toggleItalic().run()}
                >
                    <FaItalic />
                </Toggle>
                <Toggle
                    pressed={editor?.isActive('underline')}
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    disabled={!editor?.can().chain().focus().toggleUnderline().run()}
                >
                    <FaUnderline />
                </Toggle>
                <Toggle onClick={() => setIsImageDialogOpen(true)}>
                    <FaImage />
                </Toggle>
                <Toggle
                    onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
                    disabled={!editor?.can().chain().focus().clearNodes().unsetAllMarks().run()}
                >
                    <FaTextSlash />
                </Toggle>
            </div>
            <div className="w-full border rounded-md">
                <EditorContent editor={editor} />
            </div>
            <ImageDialog
                isOpen={isImageDialogOpen}
                onOpenChange={setIsImageDialogOpen}
                onSelectImage={handleImageSelect}
                moduleId={moduleId}
            />
        </div>
    );
};

const KontaktDetailsDialog = ({
    isOpen,
    onOpenChange,
    onSave,
    kontaktToEdit,
    existingKontakte,
    moduleId,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (kontakt: Omit<Kontakt, "id" | "sort"> | Kontakt) => void;
    kontaktToEdit?: Kontakt | null;
    existingKontakte: Kontakt[]; // Ensure existingKontakte is passed
    moduleId: string;
}) => {
    const [selectedType, setSelectedType] = useState<string | null>(kontaktToEdit?.type || "Telefon");
    const [isSwitchActive, setIsSwitchActive] = useState(!!kontaktToEdit?.title);
    const [value, setValue] = useState<string | JSONContent>(kontaktToEdit?.value || "");
    const [title, setTitle] = useState<string>(kontaktToEdit?.title || "");
    const [address, setAddress] = useState<string | null>(kontaktToEdit?.address || null);
    const [addressLocation, setAddressLocation] = useState<{ lat: number, lng: number } | null>(
        kontaktToEdit?.addressLocation || null
    );

    const isOrtDisabled = existingKontakte.some((kontakt) => kontakt.type === "Ort");

    useEffect(() => {
        if (isOpen && !kontaktToEdit) {
            setSelectedType("Telefon");
            setValue("");
            setTitle("");
            setAddress(null);
            setAddressLocation(null);
            setIsSwitchActive(false);
        } else if (kontaktToEdit) {
            setSelectedType(kontaktToEdit.type);
            setValue(kontaktToEdit.value);
            setTitle(kontaktToEdit.title || "");
            setAddress(kontaktToEdit.address || null);
            setAddressLocation(kontaktToEdit.addressLocation || null);
            setIsSwitchActive(!!kontaktToEdit.title);
        }
    }, [isOpen, kontaktToEdit]);

    const handleToggleClick = (type: string) => {
        setSelectedType(type);
        setValue(type === "Text" ? {} : "");
        setTitle("");
        setAddress(null);
        setAddressLocation(null);
    };

    const handleSave = () => {
        const kontakt: Kontakt = {
            id: kontaktToEdit?.id || "",
            sort: kontaktToEdit?.sort || 0,
            type: selectedType!,
            value: selectedType === "Text" ? value : selectedType === "Ort" ? address! : value,
            address: selectedType === "Ort" && address ? address : undefined,
            addressLocation: selectedType === "Ort" && addressLocation ? addressLocation : undefined,
            title: isSwitchActive ? title : undefined,
        };

        const sanitizedKontakt = Object.fromEntries(
            Object.entries(kontakt).filter(([_, v]) => v !== undefined)
        ) as Kontakt;

        onSave(sanitizedKontakt); // Call the save function first
        setTimeout(() => onOpenChange(false), 0); // Close the dialog after ensuring onSave is processed
    };

    const renderContentInput = () => {
        switch (selectedType) {
            case "Telefon":
                return <Input type="tel" placeholder="Telefonnummer" value={typeof value === "string" ? value : ""} onChange={(e) => setValue(e.target.value)} className="input w-full" />;
            case "Fax":
                return <Input type="text" placeholder="Faxnummer" value={typeof value === "string" ? value : ""} onChange={(e) => setValue(e.target.value)} className="input w-full" />;
            case "Email":
                return <Input type="email" placeholder="Email-Adresse" value={typeof value === "string" ? value : ""} onChange={(e) => setValue(e.target.value)} className="input w-full" />;
            case "Website":
                return <Input type="url" placeholder="Website-URL" value={typeof value === "string" ? value : ""} onChange={(e) => setValue(e.target.value)} className="input w-full" />;
            case "Ort":
                return (
                    <AddressSelector
                        onAddressSelect={(selectedAddress, coordinates) => {
                            setAddress(selectedAddress);
                            setAddressLocation({ lat: coordinates.latitude, lng: coordinates.longitude });
                        }}
                    />
                );
            case "Text":
                return (
                    <RichTextEditor
                        value={typeof value === "object" ? value : {}}
                        onChange={(content) => setValue(content)}
                        moduleId={moduleId}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="secondary"><FaPlus /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kontakt Details hinzufügen</DialogTitle>
                    <DialogDescription>Fügen Sie die Details für den Kontakt hinzu.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-auto-fit gap-2 w-full py-6 border-b px-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
                        <Toggle pressed={selectedType === "Telefon"} onClick={() => handleToggleClick("Telefon")}><FaPhone />Telefon</Toggle>
                        <Toggle pressed={selectedType === "Fax"} onClick={() => handleToggleClick("Fax")}><FaFax />Fax</Toggle>
                        <Toggle pressed={selectedType === "Email"} onClick={() => handleToggleClick("Email")}><FaEnvelope />Email</Toggle>
                        <Toggle pressed={selectedType === "Website"} onClick={() => handleToggleClick("Website")}><FaGlobe />Website</Toggle>
                        <Toggle pressed={selectedType === "Ort"} onClick={() => handleToggleClick("Ort")} disabled={isOrtDisabled}><FaLocationDot />Ort</Toggle>
                        <Toggle pressed={selectedType === "Text"} onClick={() => handleToggleClick("Text")}><FaRegFileLines />Text</Toggle>
                    </div>
                    {renderContentInput()}
                    <div className="flex flex-col gap-4 py-6 border-t px-2">
                        {selectedType && (
                            <div className="flex items-center gap-2">
                                <Switch id="header" checked={isSwitchActive} onCheckedChange={setIsSwitchActive} />
                                <label htmlFor="header">Titel</label>
                            </div>
                        )}
                        {selectedType && isSwitchActive && (
                            <Input type="text" placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" />
                        )}
                    </div>
                </div>
                <DialogFooter className="w-full flex justify-end gap-2 mt-4">
                    <Button className="mr-auto" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button variant="secondary" onClick={handleSave}>Speichern</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default KontaktDetailsDialog;