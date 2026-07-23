"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OTPInput } from "./otp-input";
import { useRequestOTP, useVerifyOTP } from "@/hooks/use-auth";

interface PhoneOTPFormProps {
  onSuccess: () => void;
}

export function PhoneOTPForm({ onSuccess }: PhoneOTPFormProps) {
  const t = useTranslations("auth");
  const { mutateAsync: requestOTP, isPending: isRequesting } = useRequestOTP();
  const { mutateAsync: verifyOTP, isPending: isVerifying } = useVerifyOTP();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    setError("");
    if (!/^(0|\+84)[35789]\d{8}$/.test(phone)) {
      setError(t("invalidPhone"));
      return;
    }
    try {
      await requestOTP({ phone });
      setStep("otp");
      setCountdown(60);
    } catch {
      setError(t("otpError"));
    }
  };

  const handleVerifyOTP = async (code: string) => {
    try {
      await verifyOTP({ phone, code });
      onSuccess();
    } catch {
      setError(t("otpVerifyError"));
    }
  };

  return (
    <div className="space-y-4">
      {step === "phone" ? (
        <>
          <div className="flex gap-2">
            <div className="w-16 shrink-0">
              <Input value="+84" disabled className="text-center" />
            </div>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phone")}
              maxLength={12}
              inputMode="numeric"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            onClick={handleSendOTP}
            disabled={isRequesting}
            className="w-full bg-sage-500 hover:bg-sage-600 text-cream-100"
          >
            {isRequesting ? t("sending") : t("sendOTP")}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-center text-warm-800/70">
            {t("enterOTP", { phone })}
          </p>
          <OTPInput onComplete={handleVerifyOTP} disabled={isVerifying} />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button
            variant="link"
            onClick={handleSendOTP}
            disabled={countdown > 0 || isRequesting}
            className="w-full text-sage-600"
          >
            {countdown > 0 ? t("resendCountdown", { seconds: countdown }) : t("resendOTP")}
          </Button>
        </>
      )}
    </div>
  );
}
