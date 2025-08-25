import { firebaseConfig } from "@/database";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FaArrowRight, FaCheck, FaClock, FaFile, FaMinus, FaXmark } from "react-icons/fa6";
import { TbClockCheck, TbClockX } from "react-icons/tb";


if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

interface LinkModulProps {
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
        slug: string;
    };
}

const Linkmodul: React.FC<LinkModulProps> = ({ product, module }) => {
    const [url, setUrl] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const ref = doc(db, "product", product.id, "modules", module.id, "linkdetails", "link");
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data() as any;
                    if (typeof data?.url === "string") {
                        setUrl(data.url);
                    }
                }
            } catch (e: any) {
                setError(e?.message || "Konnte Link nicht laden");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [product.id, module.id]);

    return (
        <div className="w-full">
            {loading && (
                <div className="text-sm text-muted-foreground">Laden…</div>
            )}
            {!loading && error && (
                <div className="text-sm text-red-600">{error}</div>
            )}
            {!loading && !error && url && (
                <div className="w-full aspect-video">
                    <iframe
                        src={url}
                        className="w-full h-screen rounded-md border"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                    />
                </div>
            )}
            {!loading && !error && !url && (
                <div className="text-sm text-muted-foreground">Kein Link hinterlegt.</div>
            )}
        </div>
    )
}


export default Linkmodul;