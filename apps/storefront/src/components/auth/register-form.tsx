"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/use-auth";
import { toast } from "sonner";

const registerSchema = z.object({
  first_name: z.string().min(1, "Vui lòng nhập tên"),
  last_name: z.string().min(1, "Vui lòng nhập họ"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const t = useTranslations("auth");
  const { mutateAsync: register, isPending } = useRegister();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data);
      toast.success(t("registerSuccess"));
      onSuccess();
    } catch {
      toast.error(t("registerError"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="reg-first">{t("firstName")}</Label>
          <Input id="reg-first" {...registerField("first_name")} />
          {errors.first_name && <p className="text-destructive text-sm">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-last">{t("lastName")}</Label>
          <Input id="reg-last" {...registerField("last_name")} />
          {errors.last_name && <p className="text-destructive text-sm">{errors.last_name.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-email">{t("email")}</Label>
        <Input id="reg-email" type="email" {...registerField("email")} />
        {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">{t("password")}</Label>
        <Input id="reg-password" type="password" {...registerField("password")} />
        {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
      </div>
      <Button
        type="submit"
        className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100"
        disabled={isPending}
      >
        {isPending ? t("registering") : t("submitRegister")}
      </Button>
    </form>
  );
}
