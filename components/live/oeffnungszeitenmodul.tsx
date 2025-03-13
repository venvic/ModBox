import { firebaseConfig } from "@/database";
import { getApps, initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs } from "firebase/firestore";
import React from "react";
import { FaArrowRight, FaCheck, FaClock, FaFile, FaMinus, FaXmark } from "react-icons/fa6";
import { TbClockCheck, TbClockX } from "react-icons/tb";


if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const db = getFirestore();

interface OffnungszeitenProps {
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

interface time {
    break: any[];
    open: string;
    close: string;
    closed: boolean;
    name: string;
    sort: number;
}

const isCurrentlyOpen = (times: time[]) => {
  const now = new Date();
  const currentDay = times.find(time => time.sort === now.getDay());
  if (!currentDay || currentDay.closed) return false;

  const checkTime = (open: string, close: string) => {
    const [openHour, openMinute] = open.split(':').map(Number);
    const [closeHour, closeMinute] = close.split(':').map(Number);

    const openTime = new Date();
    openTime.setHours(openHour, openMinute, 0);

    const closeTime = new Date();
    closeTime.setHours(closeHour, closeMinute, 0);

    return now >= openTime && now <= closeTime;
  };

  if (checkTime(currentDay.open, currentDay.close)) return true;

  for (const brk of currentDay.break) {
    if (checkTime(brk.start, brk.end)) return true;
  }

  return false;
};

const Offnungszeiten: React.FC<OffnungszeitenProps> = ({ product, module }) => {
    const [times, setTimes] = React.useState<time[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        const fetchTimes = async () => {
            setLoading(true);
            const timesQuery = query(collection(db, `product/${product.id}/modules/${module.id}/times`));
            const querySnapshot = await getDocs(timesQuery);
            const timesList: time[] = querySnapshot.docs.map(doc => ({
                name: doc.id,
                ...doc.data()
            } as time));
            timesList.sort((a, b) => a.sort - b.sort);
            setTimes(timesList);
            setLoading(false);
        };

        fetchTimes();
    }, [product.id, module.id]);

    return (
        <div className="text-black w-full">
            {loading ? (
                <div className="flex justify-center items-center h-full">
                    <div className="loader"></div>
                </div>
            ) : (
                <>
                    <div className={`w-full flex flex-col justify-center items-center gap-2 rounded-t-md border border-b-gray-700/10 py-6 px-4 ${isCurrentlyOpen(times) ? 'bg-green-500/80 border-green-600/70' : 'bg-red-500/80 border-red-600/70'}`}>
                        {isCurrentlyOpen(times) ? 
                            <div className="relative">
                                <TbClockCheck className="text-white h-8 w-8" />
                            </div>
                        : 
                            <div className="relative">
                                <TbClockX className="text-white h-8 w-8" />
                            </div>
                        }
                        <p className="text-white text-sm font-semibold">{isCurrentlyOpen(times) ? 'Aktuell geöffnet' : 'Aktuell geschlossen'}</p>
                    </div>
                    <div className="border-t-0 rounded-t-none flex flex-col w-full border border-gray-700/10 rounded-md divide-y divide-gray-700/10">
                        {times.map(time => (
                            <div key={time.name} id={time.name} className={`flex flex-col py-3 px-4 ${time.sort === new Date().getDay() ? 'bg-gray-200/30' : ''}`}>
                                <h2 className="font-medium text-sm flex w-full justify-between">
                                    {time.name} 
                                    {time.sort === new Date().getDay() && <p className="py-1 px-3 text-xs bg-black rounded-full text-white">Heute</p>}
                                </h2>

                                {!time.closed ? (
                                    <div className="w-fit mt-[2px]">
                                        <span className="flex gap-[6px] text-sm items-center">{time.open} <FaMinus className="h-2 w-2 text-neutral-500"/> {time.close}</span>
                                        {time.break.map((brk, index) => (
                                            (brk.start !== '00:00' || brk.end !== '00:00') && (<span key={index} className="flex gap-[6px] text-sm items-center">{brk.start}<FaMinus className="h-2 w-2 text-neutral-500"/>{brk.end}</span>)
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-[2px]">
                                        <p className="text-neutral-900/80 text-xs">Geschlossen</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default Offnungszeiten;