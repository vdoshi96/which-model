import { z } from "zod";

export const usernameRules =
  "Username must be 3-20 characters and use only letters, numbers, or underscores.";
export const passwordRules =
  "Password must be at least 8 characters and include at least one number.";

export function sanitizeUsername(username: string): string {
  return username.trim();
}

const usernameSchema = z
  .string()
  .transform(sanitizeUsername)
  .pipe(
    z
      .string()
      .min(3, usernameRules)
      .max(20, usernameRules)
      .regex(/^[A-Za-z0-9_]+$/, usernameRules),
  );

export const passwordSchema = z
  .string()
  .min(8, passwordRules)
  .regex(/\d/, passwordRules);

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

export type AuthFieldErrors = Partial<Record<keyof SignUpInput, string>>;

export function getAuthFieldErrors(
  error: z.ZodError<SignUpInput> | z.ZodError<SignInInput>,
): AuthFieldErrors {
  return error.issues.reduce<AuthFieldErrors>((fieldErrors, issue) => {
    const field = issue.path[0];

    if (
      (field === "username" || field === "password") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }

    return fieldErrors;
  }, {});
}
