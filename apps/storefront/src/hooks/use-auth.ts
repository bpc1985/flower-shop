"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { medusaClient, getStoredToken } from "@/lib/medusa-client";
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
      } catch (err: any) {
        // 401 = not authenticated (normal)
        if (err?.status === 401 || err?.response?.status === 401) return null;
        // No customer linked to auth identity yet — this is expected for test accounts
        if (err?.status === 404) return null;
        // Network errors or unexpected failures
        throw err;
      }
    },
    retry: 1,
    staleTime: 0,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      const token = await authClient.login({ email, password });
      return token;
    },
    onSuccess: () => {
      // Force immediate refetch — don't wait for stale cache
      queryClient.refetchQueries({ queryKey: queryKeys.customer.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const token = await authClient.register(input);
      return token;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: queryKeys.customer.all });
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
      // Force customer to null immediately — don't wait for refetch
      queryClient.setQueryData(queryKeys.customer.current(), null);
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
