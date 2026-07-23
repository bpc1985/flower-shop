"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, onComplete, disabled }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    if (value && index < length - 1) {
      refs.current[index + 1]?.focus();
    }

    const code = newValues.join("");
    if (code.length === length) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const newValues = [...values];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setValues(newValues);
    if (pasted.length === length) onComplete(pasted);
  };

  const inputClasses = cn(
    "flex h-14 w-12 rounded-md border border-input bg-transparent px-0 py-1 text-center text-lg font-semibold shadow-sm transition-colors",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          value={val}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          maxLength={1}
          className={inputClasses}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
