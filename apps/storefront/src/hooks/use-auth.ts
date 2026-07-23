"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { medusaClient } from "@/lib/medusa-client";
import { queryKeys } from "./query-keys";
import { toast } from "sonner";

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface PhoneOTPInput {
  phone: string;
}

interface PhoneOTPVerifyInput {
  phone: string;
  code: string;
}

export function useCustomer() {
  return useQuery({
    queryKey: queryKeys.customer.current(),
    queryFn: async () => {
      try {
        const { customer } = await medusaClient.store.customer.retrieve();
        return customer as any;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      return authClient.login({ email, password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      return authClient.register(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
    },
  });
}

export function useRequestOTP() {
  return useMutation({
    mutationFn: async ({ phone }: PhoneOTPInput) => {
      return authClient.requestOTP({ phone });
    },
    onSuccess: () => {
      toast.success("Đã gửi mã OTP");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể gửi mã OTP");
    },
  });
}

export function useVerifyOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phone, code }: PhoneOTPVerifyInput) => {
      return authClient.verifyOTP({ phone, code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
      toast.success("Xác thực thành công");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Mã OTP không đúng");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await authClient.logout();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      queryClient.removeQueries({ queryKey: queryKeys.customer.all });
      queryClient.removeQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useLoginWithGoogle() {
  return useMutation({
    mutationFn: async () => {
      authClient.loginWithGoogle();
    },
  });
}
