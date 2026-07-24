"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { toast } from "sonner";

const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailLoginFormProps {
  onSuccess: () => void;
}

export function EmailLoginForm({ onSuccess }: EmailLoginFormProps) {
  const t = useTranslations("auth");
  const { mutateAsync: login, isPending } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      await login(data);
      toast.success(t("loginSuccess"));
      onSuccess();
    } catch {
      toast.error(t("loginError"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">{t("email")}</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="hello@example.com"
          className={errors.email ? "border-red-400" : ""}
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">{t("password")}</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="••••••••"
          className={errors.password ? "border-red-400" : ""}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </div>
      <Button
        type="submit"
        className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100"
        disabled={isPending}
      >
        {isPending ? t("loggingIn") : t("submitLogin")}
      </Button>
    </form>
  );
}
