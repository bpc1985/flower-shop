"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmailLoginForm } from "./email-login-form";
import { RegisterForm } from "./register-form";
import { PhoneOTPForm } from "./phone-otp-form";
import { GoogleSigninButton } from "./google-signin-button";

type Tab = "email" | "phone";

interface LoginDialogProps {
  children: React.ReactNode;
}

export function LoginDialog({ children }: LoginDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [tab, setTab] = useState<Tab>("email");
  const t = useTranslations("auth");

  const handleSuccess = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-[400px] bg-cream-100 border-cream-200">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl text-warm-900">
            {mode === "login" ? t("loginTitle") : t("registerTitle")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Tab switcher — only in login mode */}
          {mode === "login" && (
            <div className="flex bg-cream-200 rounded-lg p-0.5">
              <button
                onClick={() => setTab("email")}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                  tab === "email"
                    ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm"
                    : "text-warm-800"
                }`}
              >
                {t("emailTab")}
              </button>
              <button
                onClick={() => setTab("phone")}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${
                  tab === "phone"
                    ? "bg-cream-100 text-burgundy-600 font-medium shadow-sm"
                    : "text-warm-800"
                }`}
              >
                {t("phoneTab")}
              </button>
            </div>
          )}

          {/* Form */}
          {mode === "login" ? (
            tab === "email" ? (
              <EmailLoginForm onSuccess={handleSuccess} />
            ) : (
              <PhoneOTPForm onSuccess={handleSuccess} />
            )
          ) : (
            <RegisterForm onSuccess={handleSuccess} />
          )}

          {/* Divider + Google */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cream-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-cream-100 px-2 text-warm-800/60">{t("or")}</span>
            </div>
          </div>

          <GoogleSigninButton />

          {/* Mode toggle */}
          <div className="text-center text-sm text-warm-800/60">
            {mode === "login" ? (
              <>
                {t("noAccount")}{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-sage-600 hover:underline font-medium"
                >
                  {t("registerLink")}
                </button>
              </>
            ) : (
              <>
                {t("hasAccount")}{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-sage-600 hover:underline font-medium"
                >
                  {t("loginLink")}
                </button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
