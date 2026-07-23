import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^(0|\+84)[35789]\d{8}$/, "Số điện thoại không hợp lệ");

export const vietnamPhoneSchema = phoneSchema;

export const cardMessageSchema = z
  .string()
  .max(100, "Lời nhắn tối đa 100 ký tự")
  .optional();

export const addressSchema = z.object({
  province: z.string().min(1, "Chọn tỉnh/thành phố"),
  district: z.string().min(1, "Chọn quận/huyện"),
  ward: z.string().min(1, "Chọn phường/xã"),
  street: z.string().min(1, "Nhập địa chỉ"),
  ghnDistrictCode: z.number().optional(),
  ghnWardCode: z.string().optional(),
});

export type PhoneInput = z.infer<typeof phoneSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
