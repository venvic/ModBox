'use client'

import { firebaseConfig } from "@/database";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { useState, useEffect, JSX } from "react";
import { FaPlus, FaCloudBolt, FaEnvelope, FaTrash, FaICursor, FaAt, FaPhone, FaTextWidth, FaRegSquareCheck, FaAnglesDown, FaGear, FaGrip } from "react-icons/fa6";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, writeBatch, setDoc } from "firebase/firestore";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
  } from "@/components/ui/sheet"
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import getRandomId from "@/utils/getRandomId";

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

interface RecipientsConfiguratorProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    productId: string;
    moduleId: string;
    onChangesSaved: () => void;
}

const RecipientsConfigurator = ({ isOpen, onOpenChange, productId, moduleId, onChangesSaved }: RecipientsConfiguratorProps) => {
    const [emails, setEmails] = useState<{ id: string; email: string; active: boolean; toDelete?: boolean }[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [changesMade, setChangesMade] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchEmails();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && emails.length === 0) {
            setEmails([{ id: getRandomId(undefined, 8), email: "info@cosmema.de", active: true }]);
            setChangesMade(true);
        }
    }, [isOpen, emails]);

    const fetchEmails = async () => {
        const querySnapshot = await getDocs(collection(db, `product/${productId}/modules/${moduleId}/recipients`));
        const emailsData = querySnapshot.docs.map(doc => ({ id: doc.id, email: doc.data().email, active: doc.data().active }));
        setEmails(emailsData);
    };

    const addEmail = () => {
        const newId = getRandomId(undefined, 8);
        setEmails([...emails, { id: newId, email: newEmail, active: true }]);
        setNewEmail('');
        setChangesMade(true);
    };

    const updateEmailStatus = (emailId: string, active: boolean) => {
        const updatedEmails = emails.map(email => email.id === emailId ? { ...email, active } : email);
        setEmails(updatedEmails);
        setChangesMade(true);
    };

    const markEmailForDeletion = (emailId: string) => {
        const updatedEmails = emails.map(email => email.id === emailId ? { ...email, toDelete: true } : email);
        setEmails(updatedEmails);
        setChangesMade(true);
    };

    const saveChanges = async () => {
        try {
            const batch = writeBatch(db);
            emails.forEach(email => {
                const emailRef = doc(db, `product/${productId}/modules/${moduleId}/recipients`, email.id);
                if (email.toDelete) {
                    batch.delete(emailRef);
                } else {
                    batch.set(emailRef, { email: email.email, active: email.active });
                }
            });
            await batch.commit();
            setChangesMade(false);
            onChangesSaved();
            onOpenChange(false);
            toast.success("Speichern erfolgreich");
        } catch (error:any) {
            toast.error("Fehler beim Speichern", { description: error.message });
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button>Empfänger</Button>
            </SheetTrigger>
            <SheetContent className="min-w-[460px] h-full flex flex-col justify-between">
                <SheetHeader>
                    <SheetTitle>Email Empfänger</SheetTitle>
                    <SheetDescription>
                        <div className="flex gap-2">
                            <Input className="text-foreground placeholder:text-foreground/40" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="info@example.com" />
                            <Button variant="secondary" onClick={addEmail}>Hinzufügen</Button>
                        </div>
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-2 flex-1">
                    {emails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <FaCloudBolt size={48} className="mb-2" />
                            <p>Keine Email vorhanden</p>
                        </div>
                    ) : (
                        emails.map(email => (
                            <div key={email.id} className={`flex items-center justify-between ${email.toDelete ? 'opacity-40' : ''}`}>
                                <span className="flex items-center gap-2"><FaEnvelope/> {email.email}</span>
                                <div className="flex items-center gap-4">
                                    <Switch checked={email.active} onCheckedChange={(checked) => updateEmailStatus(email.id, checked)} />
                                    <Button variant="destructive" onClick={() => markEmailForDeletion(email.id)}><FaTrash/></Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <Button onClick={saveChanges} disabled={!changesMade} variant={changesMade ? 'secondary' : 'default'} className="mt-4">Speichern</Button>
            </SheetContent>
        </Sheet>
    );
};

const fieldTypes = [
    { type: 'Textfield', icon: <FaICursor className="text-black"/> },
    { type: 'Emailfield', icon: <FaAt className="text-black"/> },
    { type: 'Phonefield', icon: <FaPhone className="text-black"/> },
    { type: 'Messagefield', icon: <FaTextWidth className="text-black"/> },
    { type: 'Checkboxfield', icon: <FaRegSquareCheck className="text-black"/> },
    { type: 'Dropdownfield', icon: <FaAnglesDown className="text-black"/> },
];

interface FieldConfiguratorProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSave: (field: any) => void;
    fieldData: any;
    changesMade: boolean;
}

const FieldConfigurator = ({ isOpen, onOpenChange, onSave, fieldData, changesMade }: FieldConfiguratorProps) => {
    const [fieldType, setFieldType] = useState(fieldTypes[0].type);
    const [fieldLabel, setFieldLabel] = useState('');
    const [placeholder, setPlaceholder] = useState('');
    const [isRequired, setIsRequired] = useState(false);
    const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
    const [newOption, setNewOption] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (fieldData) {
                setFieldType(fieldData.type);
                setFieldLabel(fieldData.label);
                setPlaceholder(fieldData.placeholder || '');
                setIsRequired(fieldData.required);
                setDropdownOptions(fieldData.options || []);
            } else {
                resetFields();
            }
        }
    }, [fieldData, isOpen]);

    const resetFields = () => {
        setFieldType(fieldTypes[0].type);
        setFieldLabel('');
        setPlaceholder('');
        setIsRequired(false);
        setDropdownOptions([]);
    };

    const handleSave = () => {
        onSave({ id: fieldData?.id || getRandomId(undefined, 8), type: fieldType, label: fieldLabel, placeholder, required: isRequired, sort: fieldData?.sort || 0, options: dropdownOptions });
        onOpenChange(false);
    };

    const addOption = () => {
        setDropdownOptions([...dropdownOptions, newOption]);
        setNewOption('');
    };

    const removeOption = (option: string) => {
        setDropdownOptions(dropdownOptions.filter((opt: string) => opt !== option));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="secondary" disabled={changesMade}><FaPlus /> Feld</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Feld konfigurieren</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <Select value={fieldType} onValueChange={(value) => setFieldType(value)}>
                        <SelectTrigger className="w-full text-foreground placeholder:text-neutral-400">
                            <SelectValue placeholder="Feldart" />
                        </SelectTrigger>
                        <SelectContent>
                            {fieldTypes.map(ft => (
                                <SelectItem key={ft.type} value={ft.type}>
                                    {ft.type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input className="placeholder:text-foreground/40" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="Label" />
                    {fieldType !== 'Checkboxfield' && (
                        <Input className="placeholder:text-foreground/40" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} placeholder="Placeholder" />
                    )}
                    <div className="flex items-center gap-2">
                        <Switch checked={isRequired} onCheckedChange={(checked) => setIsRequired(checked)} />
                        <span>Erforderlich</span>
                    </div>
                    {fieldType === 'Dropdownfield' && (
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Input className="placeholder:text-foreground/40" value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Option hinzufügen" />
                                <Button variant="secondary" onClick={addOption}>Hinzufügen</Button>
                            </div>
                            <div className="flex flex-col gap-1">
                                {dropdownOptions.map((option: string, index: number) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <span>{option}</span>
                                        <Button variant="destructive" onClick={() => removeOption(option)}>Löschen</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>Speichern</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
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

const FormularmodulEditor = ({ id, productId, onChangesSaved }: { id: string, productId: string, onChangesSaved: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    interface Field {
        id: string;
        type: string;
        label: string;
        placeholder: string;
        required: boolean;
        sort: number;
        options?: string[];
        toDelete?: boolean;
    }
    
    const [fields, setFields] = useState<Field[]>([]);
    const [changesMade, setChangesMade] = useState(false);
    const [isFieldConfiguratorOpen, setIsFieldConfiguratorOpen] = useState(false);
    const [fieldToEdit, setFieldToEdit] = useState<Field | null>(null);

    useEffect(() => {
        fetchFields();
    }, []);

    const fetchFields = async () => {
        const querySnapshot = await getDocs(collection(db, `product/${productId}/modules/${id}/data`));
        const fieldsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            type: doc.data().type,
            label: doc.data().label,
            placeholder: doc.data().placeholder,
            required: doc.data().required,
            sort: doc.data().sort,
            options: doc.data().options || []
        }));
        setFields(fieldsData.sort((a, b) => a.sort - b.sort));
    };

    const addField = (field: Field) => {
        setFields([...fields, { ...field, id: getRandomId(undefined, 8), sort: fields.length + 1 }]);
        setChangesMade(true);
        setFieldToEdit(null);
    };

    const updateField = (updatedField: Field) => {
        const updatedFields = fields.map(field => field.id === updatedField.id ? updatedField : field);
        setFields(updatedFields);
        setChangesMade(true);
        setFieldToEdit(null);
    };

    const markFieldForDeletion = (fieldId: string) => {
        const updatedFields = fields.map(field => field.id === fieldId ? { ...field, toDelete: true } : field);
        setFields(updatedFields);
        setChangesMade(true);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = fields.findIndex(field => field.id === active.id);
            const newIndex = fields.findIndex(field => field.id === over.id);
            const newFields = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
                ...field,
                sort: index + 1,
            }));
            setFields(newFields);
            setChangesMade(true);
        }
    };

    const saveChanges = async () => {
        try {
            const batch = writeBatch(db);
            const updatedFields = fields.filter(field => !field.toDelete).map((field, index) => ({ ...field, sort: index + 1 }));
            updatedFields.forEach(field => {
                const fieldRef = doc(db, `product/${productId}/modules/${id}/data`, field.id);
                batch.set(fieldRef, { type: field.type, label: field.label, placeholder: field.placeholder, required: field.required, sort: field.sort, options: field.options || [] });
            });
            const deletedFields = fields.filter(field => field.toDelete);
            deletedFields.forEach(field => {
                const fieldRef = doc(db, `product/${productId}/modules/${id}/data`, field.id);
                batch.delete(fieldRef);
            });
            await batch.commit();
            setChangesMade(false);
            onChangesSaved();
            toast.success("Änderungen gespeichert");
            fetchFields();
        } catch (error:any) {
            toast.error("Fehler beim Speichern", { description: error.message });
        }
    };

    return (
        <div className="w-full h-full">
            <div className="w-full flex gap-4 mb-10">
                <Input placeholder='Suche...' className='text-foreground placeholder:text-neutral-100/50' />
                <FieldConfigurator 
                    isOpen={isFieldConfiguratorOpen} 
                    onOpenChange={(isOpen) => {
                        setIsFieldConfiguratorOpen(isOpen);
                        if (!isOpen) setFieldToEdit(null); 
                    }} 
                    onSave={fieldToEdit ? updateField : addField} 
                    fieldData={fieldToEdit} 
                    changesMade={changesMade}
                />
                <RecipientsConfigurator 
                    isOpen={isSheetOpen} 
                    onOpenChange={setIsSheetOpen} 
                    productId={productId} 
                    moduleId={id} 
                    onChangesSaved={onChangesSaved} 
                />
            </div>

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                    <div className="w-full h-full flex flex-col max-h-[802px] overflow-y-scroll divide-y divide-white/10">
                        {fields.map(field => (
                            <SortableItem key={field.id} id={field.id}>
                                {(listeners: any) => (
                                    <div className={`flex items-center py-2 justify-between ${field.toDelete ? 'opacity-40' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="h-full w-fit" {...listeners}>
                                                <FaGrip />
                                            </div>
                                            <div className="bg-neutral-300 p-1 rounded-md">
                                                {fieldTypes.find(ft => ft.type === field.type)?.icon} 
                                            </div>
                                            <span>{field.label}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Button variant="outline" onClick={() => { setFieldToEdit(field); setIsFieldConfiguratorOpen(true); }}>Bearbeiten</Button>
                                            <Button variant="destructive" onClick={() => markFieldForDeletion(field.id)}><FaTrash /></Button>
                                        </div>
                                    </div>
                                )}
                            </SortableItem>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            {changesMade && <Button onClick={saveChanges} variant="secondary" className="mt-4">Änderungen speichern</Button>}
        </div>
    );
};

export default FormularmodulEditor;