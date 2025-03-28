'use client';

import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { JSONContent } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Heading from '@tiptap/extension-heading';
import { Toggle } from "@/components/ui/toggle";
import { FaBold, FaItalic, FaUnderline, FaImage, FaTextSlash } from "react-icons/fa6";
import AddressSelector from "@/components/addressSelector";
import ImageDialog from "@/components/editors/kontaktmodul/imageDialog";

type Kontakt = {
    id: string;
    sort: number;
    type: string;
    value: string | JSONContent;
    address?: string;
    addressLocation?: { lat: number, lng: number };
    title?: string;
};

const EditKontaktDialog = ({
    isOpen,
    onOpenChange,
    kontakt,
    onSave,
    moduleId,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    kontakt: Kontakt | null;
    onSave: (updatedKontakt: Kontakt) => void;
    moduleId: string;
}) => {
    const [value, setValue] = useState<string | JSONContent>(kontakt?.value || "");
    const [title, setTitle] = useState<string>(kontakt?.title || "");
    const [address, setAddress] = useState<string | null>(kontakt?.address || null);
    const [addressLocation, setAddressLocation] = useState<{ lat: number, lng: number } | null>(
        kontakt?.addressLocation || null
    );
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

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
        content: typeof value === "object" ? value : "",
        onUpdate: ({ editor }) => {
            setValue(editor.getJSON());
        },
        editorProps: {
            attributes: {
                class: 'focus:outline-none prose prose-2xl border rounded-md p-2',
            },
        },
    });

    const handleImageSelect = (url: string) => {
        editor?.chain().focus().setImage({ src: url }).run();
    };

    const addImage = () => {
        setIsImageDialogOpen(true);
    };

    useEffect(() => {
        if (kontakt) {
            setValue(kontakt.type === "Text" && typeof kontakt.value === "string" ? JSON.parse(kontakt.value) : kontakt.value);
            setTitle(kontakt.title || "");
            setAddress(kontakt.address || null);
            setAddressLocation(kontakt.addressLocation || null);
            if (kontakt.type === "Text" && editor) {
                editor.commands.setContent(
                    kontakt.type === "Text" && typeof kontakt.value === "string" ? JSON.parse(kontakt.value) : kontakt.value
                );
            }
        }
    }, [kontakt, editor]);

    const handleSave = () => {
        if (kontakt) {
            const updatedKontakt = {
                ...kontakt,
                value: kontakt.type === "Text" ? value : value,
                address: kontakt.type === "Ort" ? address || null : null,
                addressLocation: kontakt.type === "Ort" ? addressLocation || null : null,
                title,
            };

            // remove undefined fields
            const sanitizedKontakt = Object.fromEntries(
                Object.entries(updatedKontakt).filter(([_, v]) => v !== undefined)
            );

            onSave(sanitizedKontakt as Kontakt);
            onOpenChange(false);
        }
    };

    if (!kontakt) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kontakt bearbeiten</DialogTitle>
                    <DialogDescription>Bearbeiten Sie die Details für diesen Kontakt.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    {kontakt.type === "Text" ? (
                        <div>
                            <label className="block mb-2 text-sm font-medium">Text-Inhalt</label>
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
                                <Toggle onClick={addImage}>
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
                    ) : kontakt.type === "Ort" ? (
                        <div>
                            <label className="block mb-2 text-sm font-medium">Adresse auswählen</label>
                            <AddressSelector
                                onAddressSelect={(selectedAddress, coordinates) => {
                                    setAddress(selectedAddress);
                                    setAddressLocation({ lat: coordinates.latitude, lng: coordinates.longitude });
                                }}
                            />
                            {address && (
                                <p className="mt-2 text-sm text-gray-500">
                                    Aktuelle Adresse: {address}
                                </p>
                            )}
                        </div>
                    ) : (
                        <Input
                            type="text"
                            placeholder="Wert"
                            value={typeof value === "string" ? value : ""}
                            onChange={(e) => setValue(e.target.value)}
                            className="input w-full"
                        />
                    )}
                    <Input
                        type="text"
                        placeholder="Titel"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input w-full"
                    />
                </div>
                <DialogFooter className="w-full flex justify-end gap-2 mt-4">
                    <Button className="mr-auto" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button variant="secondary" onClick={handleSave}>Speichern</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditKontaktDialog;
