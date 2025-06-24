import { firebaseConfig } from "@/database";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs } from "firebase/firestore";
import React from "react";
import { Button } from "../ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Cookies from "js-cookie";

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

interface FormularModulProps {
    product: {
        id: string;
        slug: string;
    }
    module: {
        id: string;
        name: string;
        description: string;
        type: string;
        settings: string;
        privacy: string;
        slug: string;
        emailTitle?: string;
    };
}

interface data {
    id: string;
    label: string;
    placeholder: string;
    required: boolean;
    sort: number;
    type: string;
    options: string[];
}

const Formularmodul: React.FC<FormularModulProps> = ({ product, module }) => {
    const [data, setData] = React.useState<data[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [cooldown, setCooldown] = React.useState<number | null>(null);
    const [notification, setNotification] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [showFullScreenNotification, setShowFullScreenNotification] = React.useState<boolean>(false);

    React.useEffect(() => {
        const fetchFields = async () => {
            const dataQuery = query(collection(db, `product/${product.id}/modules/${module.id}/data`));
            const querySnapshot = await getDocs(dataQuery);
            const dataList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as data[];
            dataList.sort((a, b) => a.sort - b.sort);
            setData(dataList);
            setLoading(false);
        };

        const fetchRecipients = async () => {
            const recipientsQuery = query(collection(db, `product/${product.id}/modules/${module.id}/recipients`));
            const querySnapshot = await getDocs(recipientsQuery);
            const recipientsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as { id: string; active: boolean; email: string }[];
            console.log(recipientsList);
        };

        fetchFields();
        fetchRecipients();

        const cooldownTime = Cookies.get('cooldown');
        if (cooldownTime) {
            const remainingTime = parseInt(cooldownTime || '0') - Date.now();
            if (remainingTime > 0) {
                setCooldown(remainingTime);
            } else {
                Cookies.remove('cooldown');
            }
        }
    }, [product.id, module.id]);

    const generateEmailHTML = (emailData: { label: string; value: string }[]) => {
        return `
            <html>
                <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
                    <div style="width: 100%; background-color: #ffffff; padding: 20px;">
                        <h1 style="color: #333; font-size: 24px;">${module.emailTitle}</h1>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                            ${emailData.map((field, index) => {
                                const isImage = field.value.startsWith('https://firebasestorage.googleapis.com');
                                return `
                                    <tr style="background-color: ${index % 2 === 0 ? '#f7f7f7' : '#ffffff'};">
                                        <td style="padding: 10px; font-weight: bold; border: 1px solid #ddd;">${field.label}:</td>
                                        <td style="padding: 10px; border: 1px solid #ddd;">
                                            ${
                                                isImage
                                                ? `<img src="${field.value}" style="max-width:200px; display:block; margin-bottom:8px;"/><a href="${field.value}" target="_blank" style="color:#0066cc; text-decoration:none;">Link öffnen</a>`
                                                : field.value
                                            }
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </table>

                        <div style="margin-top: 20px; font-size: 14px; color: #666;">
                            <p>Dies ist eine automatisch generierte Email aus der Heimat Info App.</p>
                            <p>Mit freundlichen Grüßen, <br/> Ihr Partner rund um die Digitalisierung für Städte, Märkte und Gemeinden.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setNotification(null);
        setIsSubmitting(true);

        const formData = new FormData(event.target as HTMLFormElement);
        const formValues = Object.fromEntries(formData.entries());

        const fileInput = (event.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
        let uploadedImageUrl = '';
        if (fileInput?.files?.length) {
            const imageFormData = new FormData();
            imageFormData.append('file', fileInput.files[0]);

            const uploadRes = await fetch('/api/uploadTempImage', {
                method: 'POST',
                body: imageFormData,
            });

            if (!uploadRes.ok) {
                setNotification('Bild konnte nicht hochgeladen werden.');
                setIsSubmitting(false);
                return;
            }

            const { url } = await uploadRes.json();
            uploadedImageUrl = url;
        }

        const recipientsQuery = query(collection(db, `product/${product.id}/modules/${module.id}/recipients`));
        const querySnapshot = await getDocs(recipientsQuery);
        const recipientsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as { active: boolean; email: string })
        }));

        const activeRecipients = recipientsList.filter(r => r.active).map(r => r.email);

        const emailData = data.map(field => ({
            label: field.label,
            value:
                field.type === 'ImageField'
                    ? uploadedImageUrl || 'Kein Bild hochgeladen'
                    : formValues[field.id]?.toString() || ''
        }));

        const emailHTML = generateEmailHTML(emailData);

        const response = await fetch('/api/sendmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailHTML, activeRecipients, moduleTitle: module.name, emailTitle: module.emailTitle }),
        });

        if (response.ok) {
            setNotification('Nachricht wurde versendet!');
            setShowFullScreenNotification(true);
            (event.target as HTMLFormElement).reset();
            const cooldownTime = Date.now() + 2 * 60 * 1000;
            Cookies.set('cooldown', cooldownTime.toString(), { expires: 1 });
            setCooldown(2 * 60 * 1000);
            setTimeout(() => {
                setNotification(null);
                setShowFullScreenNotification(false);
            }, 2000);
        } else {
            const errorData = await response.json();
            setNotification(`Nachricht konnte nicht versendet werden! ${errorData.message}`);
            setTimeout(() => {
                setNotification(null);
                setShowFullScreenNotification(false);
            }, 2000);
        }

        setIsSubmitting(false);
    };

    React.useEffect(() => {
        if (cooldown) {
            const timer = setInterval(() => {
                const remainingTime = parseInt(Cookies.get('cooldown') || '0') - Date.now();
                if (remainingTime > 0) {
                    setCooldown(remainingTime);
                } else {
                    setCooldown(null);
                    Cookies.remove('cooldown');
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [cooldown]);

    return (
        <div className="text-black p-4 w-full">
            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <div className="loader"></div>
                </div>
            ) : (
                <div className="flex flex-col min-h-[calc(100dvh-30px)] overflow-scroll">
                    {module.description && (
                        <div className="w-full rounded px-3 p-2 bg-neutral-100 mb-5">
                            <h2 className="text-sm">{module.description}</h2>
                        </div>
                    )}

                    <form className="flex flex-col gap-3 flex-1" onSubmit={handleSubmit}>
                        {data.map(field => (
                            <div key={field.id} className="flex flex-col">
                                {field.type === 'Checkboxfield' ? (
                                    <div className="flex items-center gap-2">
                                        <Checkbox id={field.id} required={field.required} />
                                        <label htmlFor={ field.id} className="font-medium text-sm text-neutral-800">{field.label}<span className="text-red-600"> {field.required && '*'}</span></label>
                                    </div>
                                ) : (
                                    <>
                                        <label htmlFor={field.id} className="font-medium text-sm text-neutral-800 mt-3 mb-1">
                                            {field.label} <span className="text-red-600">{field.required && '*'}</span>
                                        </label>
                                        {field.type === 'ImageField' ? (
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id={field.id}
                                                name={field.id}
                                                className="border border-gray-500/30 p-2 w-full rounded focus:outline-none"
                                                required={field.required}
                                            />
                                        ) : field.type === 'Dropdownfield' ? (
                                            <select
                                                id={field.id}
                                                name={field.id}
                                                className="border border-gray-500/30 p-2 rounded focus:outline-none"
                                                required={field.required}
                                            >
                                                {field.options.map((option, index) => (
                                                    <option key={index} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                id={field.id}
                                                name={field.id}
                                                type={field.type === 'Emailfield' ? 'email' : field.type === 'Phonefield' ? 'tel' : 'text'}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                className="border border-gray-500/30 p-2 rounded focus:outline-none"
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                        <div className="mt-auto py-5 flex flex-col w-full">
                            <div className="flex gap-2 mb-2">
                                <Checkbox required/>
                                <span className="text-xs text-neutral-600">Ich stimme der Nutzung meiner personenbezogenen Daten zur Bearbeitung meiner Anfrage zu. Ihre Daten werden ausschließlich gemäß unserer {module.privacy ? (<a className="underline" href={module.privacy}>Datenschutzerklärung</a>) : (<span>Datenschutzerklärung</span>)} verwendet.</span>
                            </div>
                            {cooldown ? (
                                <Button type="button" disabled className="rounded">
                                    Abklingzeit: {Math.ceil(cooldown / 1000 / 60)} minuten verbleiben
                                </Button>
                            ) : (
                                <Button type="submit" style={{backgroundColor: module.settings}} className="rounded" disabled={isSubmitting}>
                                    {isSubmitting ? 'Sending...' : 'Senden'}
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            )}
            {showFullScreenNotification && (
                <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
                    <h1 className="text-xl font-semibold">{notification}</h1>
                </div>
            )}
        </div>
    );
}

export default Formularmodul;