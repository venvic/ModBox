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

  return (
    <div className="flex flex-col h-screen justify-between items-center w-full py-14 bg-background text-neutral-100 font-[family-name:var(--font-geist-sans)]">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-background bg-opacity-75 z-30 backdrop-blur-sm">
          <Progress className="w-1/2 z-50" />
        </div>
      )}
      <main className="flex flex-col p-14 h-full w-full justify-center items-center">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col w-full max-w-[560px]">
          <Label className="mt-6 mb-2" htmlFor="email">Email</Label>
          <Input
            placeholder="Email"
            type="email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="text-red-500/70 text-xs mt-1">{String(errors.email.message)}</p>}
          
          <Label className="mt-6 mb-2" htmlFor="password">Passwort</Label>
          <Input
            placeholder="Passwort"
            type="password"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && <p className="text-red-500/70 text-xs mt-1">{String(errors.password.message)}</p>}
          
          <Button type="submit" className="mt-10">Login</Button>
        </form>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
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
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
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