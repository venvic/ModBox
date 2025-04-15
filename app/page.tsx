'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { auth } from "@/database";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCurrentTheme } from "@/components/theme-provider";

export default function Home() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (error: any) {
      setLoading(false);
      toast.error("Verdächtige Anmeldung verhindert", { description: `${new Date().toLocaleTimeString()}` });
    }
  };

  const titleAnimation = {
    hidden: { y: -20, opacity: 0.7, filter: "blur(4px)" },
    visible: (i: number) => ({
      y: [0, 10, 0],
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.1,
        duration: 0.8,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: 2.2,
      },
    }),
  };

  const dotAnimation = {
    animate: {
      backgroundColor: ["#ffffff1e", "#484DE5", "#ffffff3c"],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 1,
        ease: "easeInOut",
      },
    },
  };

  const renderDots = () => {
    const rows = 35;
    const cols = 35;
    const dots = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const distanceFromCenter = Math.sqrt(
          Math.pow(row - rows / 2, 2) + Math.pow(col - cols / 2, 2)
        );
        const opacity = Math.max(0.3, 1 - distanceFromCenter / (rows / 2));

        dots.push(
          <motion.div
            key={`${row}-${col}`}
            className="w-[2px] h-[2px] rounded-full bg-white/30"
            style={{ opacity }}
            animate={Math.random() > 0.8 ? "animate" : undefined}
            variants={dotAnimation}
          />
        );
      }
    }

    return dots;
  };

  const title = "ModBox";
  const theme = useCurrentTheme();

  return (
    <div className="relative flex flex-col h-screen justify-between items-center w-full py-14 bg-background text-neutral-100 font-[family-name:var(--font-geist-sans)] overflow-hidden">
      <div
        className="absolute inset-0 grid pointer-events-none z-0"
        style={{
          gridTemplateColumns: "repeat(35, 1fr)",
          gridTemplateRows: "repeat(35, 1fr)",
          gap: "0", 
        }}
      >
        {renderDots()}
      </div>
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-background bg-opacity-75 z-30 backdrop-blur-sm">
          <Progress className="w-1/2 z-50" />
        </div>
      )}
      <main className="flex flex-col p-14 h-full w-full justify-center items-center">
        <div className="flex mb-1">
          {title.split("").map((letter, index) => (
            <motion.span
              key={index}
              className={`text-5xl font-semibold ${theme === "minimal" ? "text-black" : "text-neutral-200"}`}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={titleAnimation}
            >
              {letter}
            </motion.span>
          ))}
        </div>
        <p className="mb-6 text-foreground/50">All in one module solution</p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col w-full max-w-[560px] z-50">
          <Label className="mt-6 mb-2 text-foreground" htmlFor="email">Email</Label>
          <Input
            placeholder="Email"
            type="email"
            className="bg-background"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="text-red-500/70 text-xs mt-1">{String(errors.email.message)}</p>}
          
          <Label className="mt-6 mb-2 text-foreground" htmlFor="password">Passwort</Label>
          <Input
            placeholder="Passwort"
            type="password"
            className="bg-background"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && <p className="text-red-500/70 text-xs mt-1">{String(errors.password.message)}</p>}
          
          <Button type="submit" className="mt-10">Login</Button>
        </form>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 text-foreground hover:underline hover:underline-offset-4"
          href="https://github.com/akos-one/modbox"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Dokumentation
        </a>
        <a
          className="flex items-center gap-2 text-foreground hover:underline hover:underline-offset-4"
          href="https://heimatinfo-application-web-administration.azurewebsites.net/login"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="window icon"
            width={16}
            height={16}
          />
          Heimat Info
        </a>
      </footer>
    </div>
  );
}